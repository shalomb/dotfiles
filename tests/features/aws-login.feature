Feature: AWS Login Function
  As a developer using AWS
  I want to authenticate with AWS SSO
  So that I can access AWS resources securely

  Background:
    Given the AWS functions are loaded
    And I have a test account "tec-man-eng-dev"

  Scenario: Basic login without browser
    When I run "aws-login tec-man-eng-dev"
    Then the command should succeed
    And no browser should be launched
    And AWS credentials should be displayed

  Scenario: Login with credential export
    When I run "aws-login tec-man-eng-dev /tmp/test-creds.sh"
    Then the command should succeed
    And no browser should be launched
    And credentials should be exported to "/tmp/test-creds.sh"
    And the exported credentials should be real (not masked)

  Scenario: Login with console flag
    When I run "aws-login tec-man-eng-dev -c"
    Then the command should succeed
    And AWS console should be opened
    And AWS credentials should be displayed

  Scenario: Credential file sourcing
    Given credentials are exported to "/tmp/test-creds.sh"
    When I run "source /tmp/test-creds.sh; aws-whoami"
    Then the command should succeed
    And no browser should be launched
    And AWS credentials should be displayed