Feature: Natural sentence parsing and concentric zone-weighted file discovery

  As a developer using Pi
  I want to find files across my workspace and indexed filesystem using natural language
  So that I can locate templates, configs, and code snippets instantly without losing flow or polluting context

  Background:
    Given Pi agent is active with the locate extension loaded
    And the current working directory is a git repository

  Scenario: Parse conversational query into path and content terms
    When the user submits "/locate find +blank +template and look for workspace name within"
    Then the path terms should be extracted as "blank, template"
    And the connector should be identified as "within"
    And the content terms should be extracted as "workspace, name"

  Scenario: Fresh local files take precedence in Zone 0
    Given a file "docs/template.md" created recently in the current repository
    And the file has not yet been indexed by updatedb
    When the user runs "/locate template in title"
    Then the file "docs/template.md" is discovered via git ls-files
    And its zone is classified as Zone 0 with weight 1.00

  Scenario: Strong external match outscores mediocre local match
    Given a local file "scratch/test.txt" weakly matching "template"
    And a sibling project file "iac/modules/workspace-template.tf" with exact match "blank workspace template"
    When the user runs "/locate blank template in workspace"
    Then both candidates are harvested into the unified pool
    And the sibling project file is ranked higher due to match quality despite distance penalty

  Scenario: Context window protection via bounded pointer receipt
    Given plocate matches 45,000 files across user caches and repos
    When the locate command processes the raw index output
    Then noise directories (.git, .cache, node_modules) are masked out at stream time
    And child paths within repositories are collapsed to candidate directory anchors
    And scoped rg is executed only against the top 15 candidate anchors
    And the final receipt returned to the agent context is capped at 25 lines
