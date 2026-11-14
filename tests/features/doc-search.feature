Feature: Document library search page
  A reader finds a filed document quickly and keeps the guidance within reach.

  Scenario: The empty library explains itself
    Given the document library has no documents
    When the reader opens the search page
    Then the page shows guidance on how to file a document

  Scenario: Typing moves the page to search mode
    Given the reader sees the search page with its legend
    When the reader types a query
    Then the search box stays at the top of the page
    And the legend is folded but can be reopened
    And only matching documents are shown

  Scenario: Clearing the query restores the landing view
    Given the reader has typed a query
    When the reader clears the query
    Then the search box returns to the centre
    And the full legend is visible

  Scenario: Escape clears the query
    Given the reader has typed a query
    When the reader presses Escape
    Then the page shows the landing view

  Scenario: Search stays fast in a large library
    Given the document library has 2000 documents
    When the reader types a query
    Then the matching documents appear within 50 milliseconds
