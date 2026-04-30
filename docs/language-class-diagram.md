``` mermaid
---
title: Essence textual syntax — construct map
description: Derived from language-class-spec.json; namespaces match JSON groups; arrows are conceptual (composition, unions, common containment).
---
flowchart TB
  subgraph Root_Elements["Root_Elements"]
    direction TB
    Model
    GroupElement
    PatternElement
    PracticeElement
    AnyElement
    KernelElement
    StateOrLevel
    AlphaOrWorkProduct
    AbstractActivity
    PracticeContent
    MethodContent
  end

  subgraph Element_Groups["Element_Groups"]
    direction TB
    Kernel
    Practice
    Library
    PracticeAsset
    Method
  end

  subgraph Kernel_Elements["Kernel_Elements"]
    direction TB
    Alpha
    State
    CheckListItem
    AlphaAssociation
    AlphaContainment
    ActivitySpace
    Competency
    CompetencyLevel
  end

  subgraph Practice_Elements["Practice_Elements"]
    direction TB
    WorkProduct
    Level
    WorkProductManifest
    Activity
    ActivityAssociation
    Pattern
    PatternAssociation
    WorkBreakdown
    Complexity
    PrerequisiteAndAssumption
    TeamRole
  end

  subgraph Auxiliary_Elements["Auxiliary_Elements"]
    direction TB
    UserDefinedType
    Tag
    Resource
    AddedTags
    ExtensionElement
    MergeResolution
  end

  Model -->|"elements *"| GroupElement

  GroupElement -.->|union| Kernel
  GroupElement -.->|union| Practice
  GroupElement -.->|union| Library
  GroupElement -.->|union| PracticeAsset
  GroupElement -.->|union| Method

  PracticeElement -.->|union| PatternElement
  PracticeElement -.->|union| ExtensionElement
  PracticeElement -.->|union| MergeResolution
  PracticeElement -.->|union| UserDefinedType

  AnyElement -.->|union| GroupElement
  AnyElement -.->|union| PracticeElement
  AnyElement -.->|union| State
  AnyElement -.->|union| Level
  AnyElement -.->|union| CheckListItem
  AnyElement -.->|union| CompetencyLevel
  AnyElement -.->|union| PatternAssociation
  AnyElement -.->|union| Tag
  AnyElement -.->|union| Resource

  KernelElement -.->|union| Alpha
  KernelElement -.->|union| AlphaAssociation
  KernelElement -.->|union| AlphaContainment
  KernelElement -.->|union| ActivitySpace
  KernelElement -.->|union| Competency
  KernelElement -.->|union| Kernel
  KernelElement -.->|union| ExtensionElement
  KernelElement -.->|union| MergeResolution
  KernelElement -.->|union| UserDefinedType

  StateOrLevel -.->|union| State
  StateOrLevel -.->|union| Level

  AlphaOrWorkProduct -.->|union| Alpha
  AlphaOrWorkProduct -.->|union| WorkProduct

  AbstractActivity -.->|union| Activity
  AbstractActivity -.->|union| ActivitySpace
  AbstractActivity -.->|union| WorkBreakdown

  PracticeContent -.->|union| PracticeElement
  PracticeContent -.->|union| Practice
  PracticeContent -.->|union| PracticeAsset

  MethodContent -.->|union| Practice
  MethodContent -.->|union| ExtensionElement
  MethodContent -.->|union| MergeResolution

  Kernel -->|"owns *"| KernelElement
  Practice -->|"owns *"| PracticeElement
  Practice -->|"uses *"| PracticeContent
  Library -->|"owns *"| GroupElement
  PracticeAsset -->|"owns *"| PracticeElement
  Method -->|"owns *"| MethodContent
  Method -->|"uses *"| Practice

  PatternElement -.->|union| Alpha
  PatternElement -.->|union| AlphaAssociation
  PatternElement -.->|union| AlphaContainment
  PatternElement -.->|union| WorkProduct
  PatternElement -.->|union| WorkProductManifest
  PatternElement -.->|union| Activity
  PatternElement -.->|union| ActivitySpace
  PatternElement -.->|union| ActivityAssociation
  PatternElement -.->|union| Competency
  PatternElement -.->|union| Pattern
  PatternElement -.->|union| WorkBreakdown
  PatternElement -.->|union| Complexity
  PatternElement -.->|union| PrerequisiteAndAssumption
  PatternElement -.->|union| TeamRole

  Alpha -->|"with states +"| State
  State -->|"checks *"| CheckListItem
  Competency -->|"has *"| CompetencyLevel
  WorkProduct -->|"with levels +"| Level
  Level -->|"checks *"| CheckListItem
  Pattern -->|"0..*"| PatternAssociation
  AddedTags -->|tag set| Tag

  ExtensionElement -->|"targets"| AnyElement
  ExtensionElement --> AddedTags

  classDef root fill:#e8f4fc,stroke:#1565c0
  classDef group fill:#e8f5e9,stroke:#2e7d32
  classDef kernel fill:#fff3e0,stroke:#ef6c00
  classDef practice fill:#fce4ec,stroke:#c2185b
  classDef aux fill:#f3e5f5,stroke:#7b1fa2

  class Model,GroupElement,PatternElement,PracticeElement,AnyElement,KernelElement,StateOrLevel,AlphaOrWorkProduct,AbstractActivity,PracticeContent,MethodContent root
  class Kernel,Practice,Library,PracticeAsset,Method group
  class Alpha,State,CheckListItem,AlphaAssociation,AlphaContainment,ActivitySpace,Competency,CompetencyLevel kernel
  class WorkProduct,Level,WorkProductManifest,Activity,ActivityAssociation,Pattern,PatternAssociation,WorkBreakdown,Complexity,PrerequisiteAndAssumption,TeamRole practice
  class UserDefinedType,Tag,Resource,AddedTags,ExtensionElement,MergeResolution aux
```