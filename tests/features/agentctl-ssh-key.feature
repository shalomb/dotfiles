Feature: SSH key stays usable through gpg-agent
  As a developer whose SSH key lives in gpg-agent
  I want agentctl to keep the key unlocked and ask for its passphrase where I can see it
  So that "ssh <host>" never silently falls back to a password prompt

  The agent forgets the passphrase after its cache lifetime (24 hours here).
  When it does, the next ssh connection needs the passphrase again, and the
  agent can only ask on the terminal it was last pointed at.

  Background:
    Given my SSH key is held by gpg-agent
    And the agent forgets SSH passphrases 24 hours after they are entered

  Rule: The passphrase is only ever asked for on my terminal

    Scenario: Recovering asks for the passphrase on my terminal, not a stale one
      Given the SSH key is locked
      And the agent was last pointed at another terminal
      When I recover the SSH agent from my terminal
      Then I am asked for the SSH passphrase on my terminal
      And I am not asked for it on any other terminal
      And the SSH key is unlocked

    Scenario: An agent that ignores terminal changes is diagnosed
      Given the SSH key is locked
      And the agent is configured to ignore terminal changes
      When I recover the SSH agent from my terminal
      Then it fails
      And I am told the agent ignores terminal changes and how to fix it
      And I am not asked for the SSH passphrase

  Rule: Checking the agent never asks for a passphrase

    Scenario: A locked key is reported as locked
      Given the SSH key is locked
      When I check the SSH agent status
      Then the SSH key is reported as locked
      And I am not asked for the SSH passphrase

    Scenario: An unlocked key is reported as unlocked
      Given the SSH key is unlocked
      When I check the SSH agent status
      Then the SSH key is reported as unlocked

  Rule: Ensuring the key is usable keeps ssh from falling back to a password

    Scenario: Nothing is asked when the key is already unlocked
      Given the SSH key is unlocked
      When I ensure the SSH key is usable from my terminal
      Then it succeeds
      And I am not asked for the SSH passphrase

    Scenario: A locked key is unlocked from my terminal
      Given the SSH key is locked
      And the agent was last pointed at another terminal
      When I ensure the SSH key is usable from my terminal
      Then I am asked for the SSH passphrase on my terminal
      And it succeeds
      And the SSH key is unlocked

    Scenario: Without a terminal, a locked key fails fast without prompting anywhere
      Given the SSH key is locked
      When I ensure the SSH key is usable without a terminal
      Then it fails
      And I am told the SSH key is locked and needs a terminal to unlock
      And I am not asked for the SSH passphrase

  Rule: I can see when the passphrase will be needed again

    Scenario: Status shows when an unlock made by agentctl expires
      Given I unlocked the SSH key through agentctl 20 hours ago
      When I check the SSH agent status
      Then I am told the SSH passphrase will be needed again within 4 hours

    Scenario: Status admits it does not know when an outside unlock expires
      Given the SSH key is unlocked
      And agentctl has no record of when it was unlocked
      When I check the SSH agent status
      Then I am told the SSH passphrase expiry is unknown
