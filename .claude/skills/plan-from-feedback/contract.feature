Feature: Plan from Feedback — keleo-studio
  As a maintainer of the practice studio
  I want issues triaged and resolved from this project's tracker
  So that defects are fixed at the layer that causes them rather than where they show

  Background:
    Given keleo-labs/keleo-studio is a public GitHub repository with issues enabled
    And the feedback foundation defines the workflow, routing and sanitisation rules
    And this project does not read the feedback register

  # --- Queue ---

  Scenario: Queue comes from this project's tracker
    Given issues exist on keleo-labs/keleo-studio
    When the resolution workflow begins
    Then the queue is read from the tracker
    And the feedback register is not consulted

  Scenario: Issue raised from the application names its route
    Given an issue records a page and navigator mode
    When the change is located
    Then those identify the route directly

  # --- Levels ---

  Scenario: Presentation defect fixed in the component
    Given an issue reports something rendered or laid out wrongly
    And the underlying value is correct
    When the fix is applied
    Then it is made in the component

  Scenario: Wrong value rendered correctly
    Given an issue reports a wrong value on a page
    And the value is wrong before it reaches the component
    When the fix is planned
    Then it is made in web/src/lib/ rather than the component
    And patching the component is rejected as hiding the defect

  Scenario: Schema gap escalates rather than being fixed
    Given an issue reveals a gap in the Practice Language
    When the resolution is planned
    Then an issue is filed on keleo-language
    And web/public/language.schema.json is not edited to diverge from upstream

  Scenario: Practice content issue belongs elsewhere
    Given an issue reports wrong content in a practice rather than a defect in the app
    When the owning project is determined
    Then it is filed on keleo-pgen-llm
    And it is not resolved here

  # --- Constraints ---

  Scenario: Storage separation preserved
    Given a fix is made in library or merge logic
    When the change is reviewed
    Then it does not reach into a storage backend directly
    And the storage-agnostic boundary is intact

  Scenario: Logic kept out of API routes
    Given a fix changes behaviour behind an API route
    When the change is applied
    Then the logic lands in web/src/lib/
    And the route remains a thin controller

  Scenario: Engineering philosophy respected
    Given a change compiles and passes lint
    When it is reviewed before closing
    Then it is also checked against SOUL.md

  # --- Validation ---

  Scenario: Build is the gate
    Given a change has been made
    When it is verified
    Then npm run build succeeds under TypeScript strict mode
    And lint passing alone is not treated as sufficient

  Scenario: Rendering change is looked at
    Given a change affects what the user sees
    When it is verified
    Then the page is run and inspected
    And compiling is not treated as evidence the defect is fixed

  # --- Closing ---

  Scenario: Change links to its issue
    Given a commit resolves an issue
    When the commit message is written
    Then it carries "Refs" or "Closes" with the issue number

  Scenario: Register-linked issue closes in both systems
    Given an issue names a register row
    When it is resolved
    Then the resolution is commented and the issue closed
    And keleo-pgen-llm updates the register row
