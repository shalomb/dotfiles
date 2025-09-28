Feature: AWS Whoami Function
  As a developer using AWS
  I want to view my current AWS identity
  So that I can verify my authentication status

  Background:
    Given the AWS functions are loaded
    And I am authenticated with AWS

  Scenario: Display credentials in terminal
    When I run "aws-whoami"
    Then the command should succeed
    And no browser should be launched
    And AWS credentials should be displayed
    And sensitive credentials should be masked

  Scenario: Export credentials to file
    When I run "aws-whoami /tmp/test-creds.sh"
    Then the command should succeed
    And no browser should be launched
    And credentials should be exported to "/tmp/test-creds.sh"
    And the exported credentials should be real (not masked)
    And the file should contain valid export statements

  Scenario: Export file should be executable
    Given credentials are exported to "/tmp/test-creds.sh"
    When I run "source /tmp/test-creds.sh"
    Then the command should succeed
    And AWS environment variables should be set