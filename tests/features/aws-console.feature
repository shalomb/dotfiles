Feature: AWS Console Function
  As a developer using AWS
  I want to open AWS console pages
  So that I can manage AWS resources through the web interface

  Background:
    Given the AWS functions are loaded
    And I am authenticated with AWS

  Scenario: Open EC2 console
    When I run "aws-console ec2"
    Then the command should succeed
    And AWS EC2 console should be opened in browser
    And the URL should contain "console.aws.amazon.com/ec2"

  Scenario: Open RDS console
    When I run "aws-console rds"
    Then the command should succeed
    And AWS RDS console should be opened in browser
    And the URL should contain "console.aws.amazon.com/rds"

  Scenario: Open EKS console
    When I run "aws-console eks"
    Then the command should succeed
    And AWS EKS console should be opened in browser
    And the URL should contain "console.aws.amazon.com/eks"

  Scenario: Open S3 console
    When I run "aws-console s3"
    Then the command should succeed
    And AWS S3 console should be opened in browser
    And the URL should contain "console.aws.amazon.com/s3"

  Scenario: Open Lambda console
    When I run "aws-console lambda"
    Then the command should succeed
    And AWS Lambda console should be opened in browser
    And the URL should contain "console.aws.amazon.com/lambda"

  Scenario: Open CloudFormation console
    When I run "aws-console cloudformation"
    Then the command should succeed
    And AWS CloudFormation console should be opened in browser
    And the URL should contain "console.aws.amazon.com/cloudformation"

  Scenario: Open general AWS console
    When I run "aws-console"
    Then the command should succeed
    And AWS SSO console should be opened