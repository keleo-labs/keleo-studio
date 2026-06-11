# Method Structure Reference

## Overview

A **Method** represents a complete, composed practice system built from:
- A **PracticeBaseline** (the foundation/kernel)
- Zero or more **Practice** extensions (overlays that extend the baseline)
- Merged **Citations** from all components

Methods support two composition patterns:
1. **Embedded objects**: Full `baselinePractice` + `practices` array
2. **String references**: `baselinePracticeName` + `practiceNames` array
3. **Hybrid**: Mix of embedded and references

---

## JSON Skeleton Structure

### Method (Root Object)

```json
{
  "kind": "method",
  "name": "My Method Name",
  "description": "Description of this method",
  
  "tags": {
    // Structured tag buckets (optional)
    "domainTags": ["Architecture", "Security"],
    "lifecycleTags": ["Strategy", "Sprints"],
    "organizationalTags": ["Platform Team"]
  },
  // OR legacy flat array:
  // "tags": ["tag1", "tag2"]
  
  "narratives": [
    // Optional narrative breakdown (see Narrative structure below)
  ],
  
  // === BASELINE (choose one approach) ===
  
  // Option 1: Embedded baseline object
  "baselinePractice": {
    "kind": "practiceBaseline",
    "name": "Platform Engineering Baseline",
    "description": "Foundation practice for platform engineering",
    
    "tags": { /* structured tags */ },
    "narratives": [ /* optional narratives */ ],
    
    "focuses": [
      {
        "kind": "focus",
        "name": "Platform",
        "description": "Internal developer platform focus area"
      }
    ],
    
    "alphas": [
      {
        "kind": "alpha",
        "name": "Platform Capability",
        "description": "A capability provided by the platform",
        "focusName": "Platform",
        
        "contributesTo": "Platform",  // Optional: specialization relationship
        
        "relatesTo": [
          // Optional: semantic relationships to other alphas
          {
            "relationship": "depends on",
            "alphaName": "Infrastructure"
          },
          {
            "relationship": "enables",
            "alphaName": "Developer Experience"
          }
        ],
        
        "states": [
          {
            "kind": "state",
            "name": "Conceptualized",
            "description": "Initial concept defined",
            "seq": 1,
            
            "checklist": [
              {
                "kind": "checklist",
                "name": "Needs identified",
                "description": "Platform capability needs are documented",
                "seq": 1,
                
                "verificationMethod": "documentation-review",
                // Options: "automated-telemetry" | "manual-audit" | "documentation-review" | "system-assertion"
                
                "evidencedBy": [
                  {
                    "workProductName": "Capability Proposal",
                    "levelOfDetailName": "Outlined"
                  }
                ]
              }
            ]
          },
          {
            "kind": "state",
            "name": "Developed",
            "description": "Implementation complete",
            "seq": 2,
            "checklist": [ /* ... */ ]
          },
          {
            "kind": "state",
            "name": "Operated",
            "description": "Running in production",
            "seq": 3,
            "checklist": [ /* ... */ ]
          }
          // Minimum 3 states required
        ]
      }
    ],
    
    "activitySpaces": [
      {
        "kind": "activitySpace",
        "name": "Capability Development",
        "description": "Activities for developing platform capabilities",
        
        "contributesTo": [
          {
            "alphaName": "Platform Capability",
            "stateName": "Developed"
          }
        ],
        
        "focusName": "Platform",
        
        "requiredCompetencies": [
          "Software Engineering",
          "Cloud Infrastructure"
        ],
        
        "involves": [
          "Platform Team"  // PersonaGroup names
        ],
        
        "activities": [
          // Nested activities (canonical structure)
          {
            "kind": "activity",
            "name": "Implement Capability",
            "description": "Develop the platform capability",
            
            // Inherits contributesTo, focusName, requiredCompetencies, involves from parent
            // (but can be explicitly set to override)
            
            "worksOn": [
              {
                "workProductName": "Platform Service",
                "levelOfDetailName": "Implemented"
              }
            ],
            
            "recommendedCompetencyLevels": [
              {
                "competencyName": "Software Engineering",
                "competencyLevelName": "Advanced"
              }
            ]
          }
        ]
      }
    ],
    
    "competencies": [
      {
        "kind": "competency",
        "name": "Software Engineering",
        "description": "Ability to design and implement software systems",
        
        "levels": [
          {
            "kind": "competencyLevel",
            "name": "Basic",
            "description": "Can implement simple features",
            "level": 1,
            "competencyName": "Software Engineering"
          },
          {
            "kind": "competencyLevel",
            "name": "Advanced",
            "description": "Can architect complex systems",
            "level": 2,
            "competencyName": "Software Engineering"
          }
        ]
      }
    ],
    
    "authors": ["Author Name"],
    "createdAt": "2026-01-15",
    "updatedAt": "2026-06-11",
    "version": "1.0.0",
    "keywords": ["platform", "engineering", "baseline"],
    
    "narrativeTypes": [
      // Optional: Narrative spine definitions
      {
        "kind": "narrativeType",
        "name": "Platform Journey",
        "description": "Story arc for platform adoption",
        
        "narrativeElements": [
          {
            "kind": "narrativeElement",
            "name": "Discovery",
            "description": "Platform discovery phase",
            "howToUse": "Describe initial platform needs discovery"
          },
          {
            "kind": "narrativeElement",
            "name": "Adoption",
            "description": "Platform adoption phase",
            "howToUse": "Describe adoption milestones"
          }
        ]
      }
    ],
    
    "citations": [
      {
        "kind": "citation",
        "name": "team-topologies",
        "description": "Team Topologies book",
        "authors": ["Skelton, M.", "Pais, M."],
        "date": "2019",
        "source": "IT Revolution Press",
        "url": "https://teamtopologies.com"
      }
    ],
    
    "baselinePracticeNames": [
      // Optional: Recursive baseline dependencies
      "Core Engineering Baseline"
    ]
  },
  
  // Option 2: String reference to baseline
  // "baselinePracticeName": "Platform Engineering Baseline",
  
  // === PRACTICES (choose one approach) ===
  
  // Option 1: Embedded practice objects
  "practices": [
    {
      "kind": "practice",
      "name": "Cloud Infrastructure Practice",
      "description": "Extends platform baseline with cloud-specific practices",
      
      "tags": { /* structured tags */ },
      "narratives": [ /* optional narratives */ ],
      
      "baselinePracticeName": "Platform Engineering Baseline",  // Required: symbolic link
      
      "practiceDependencyNames": [
        // Optional: other practices to merge before this one
        "Security Practice"
      ],
      
      "practiceElementAliases": [
        // Optional: local name aliases
        {
          "practiceElementType": "Alpha",
          "practiceElementName": "Platform Capability",
          "aliasName": "Cloud Service"
        }
      ],
      
      // === Practice can extend baseline with additional elements ===
      
      "focuses": [
        // Additional focuses beyond baseline
        {
          "kind": "focus",
          "name": "Cloud",
          "description": "Cloud infrastructure focus"
        }
      ],
      
      "alphas": [
        // Additional or specialized alphas
        {
          "kind": "alpha",
          "name": "Cloud Resource",
          "description": "Cloud infrastructure resource",
          "focusName": "Cloud",
          "contributesTo": "Platform Capability",  // Specializes baseline alpha
          "states": [ /* minimum 3 states */ ]
        }
      ],
      
      "alphaInstances": [
        // Named instances for tracking specific alphas
        {
          "kind": "alphaInstance",
          "name": "Production VPC",
          "description": "Production VPC alpha instance",
          "alphaName": "Cloud Resource"
        }
      ],
      
      "workProductInstances": [
        // Named instances for tracking specific work products
        {
          "kind": "workProductInstance",
          "name": "Terraform Modules",
          "description": "Infrastructure as code modules",
          "workProductName": "Infrastructure Code"
        }
      ],
      
      "activitySpaces": [
        // Additional activity spaces
        {
          "kind": "activitySpace",
          "name": "Cloud Resource Management",
          "description": "Managing cloud resources",
          "contributesTo": [ /* alpha contributions */ ],
          "focusName": "Cloud",
          "requiredCompetencies": ["Cloud Infrastructure"],
          "activities": [ /* nested activities */ ]
        }
      ],
      
      "activities": [
        // Optional: Flat activity list (legacy interchange)
        // Canonical structure nests under activitySpaces
        {
          "kind": "activity",
          "name": "Provision Cloud Resources",
          "description": "Provision infrastructure in cloud",
          "activitySpaceName": "Cloud Resource Management",  // Required in flat list
          "contributesTo": [ /* alpha contributions */ ],
          "focusName": "Cloud",
          "requiredCompetencies": ["Cloud Infrastructure"],
          "worksOn": [ /* work product contributions */ ],
          "recommendedCompetencyLevels": [ /* competency level refs */ ]
        }
      ],
      
      "workProducts": [
        {
          "kind": "workProduct",
          "name": "Infrastructure Code",
          "description": "Infrastructure as code artifacts",
          
          "levelsOfDetail": [
            {
              "kind": "levelOfDetail",
              "name": "Outlined",
              "description": "Basic structure defined",
              "seq": 1,
              
              "checklist": [
                {
                  "kind": "checklist",
                  "name": "Resources identified",
                  "description": "Required cloud resources documented",
                  "seq": 1
                }
              ],
              
              "contributesTo": [
                {
                  "alphaName": "Cloud Resource",
                  "stateName": "Conceptualized"
                }
              ]
            },
            {
              "kind": "levelOfDetail",
              "name": "Implemented",
              "description": "Infrastructure code written and tested",
              "seq": 2,
              "checklist": [ /* ... */ ],
              "contributesTo": [ /* ... */ ]
            }
            // Minimum 2 levels required
          ]
        }
      ],
      
      "personas": [
        {
          "kind": "persona",
          "name": "Cloud Engineer",
          "description": "Engineer specialized in cloud infrastructure",
          
          "competencies": [
            {
              "competencyName": "Cloud Infrastructure",
              "competencyLevelName": "Advanced"
            }
          ]
        }
      ],
      
      "personaGroups": [
        {
          "kind": "personaGroup",
          "name": "Platform Team",
          "description": "Team responsible for platform engineering",
          
          "personaNames": [
            "Cloud Engineer",
            "Platform Engineer"
          ]
        }
      ],
      
      "patterns": [
        {
          "kind": "pattern",
          "name": "Cloud Resource Lifecycle",
          "description": "Pattern for managing cloud resources",
          
          "narrativeTypeName": "Platform Journey",  // Optional: narrative spine
          
          "patternViews": [
            {
              "kind": "patternView",
              "name": "Initial Provisioning",
              "description": "First phase of cloud resource lifecycle",
              "seq": 1,
              
              "alphaStates": [
                // Canonical: AlphaContribution objects
                {
                  "alphaName": "Cloud Resource",
                  "stateName": "Conceptualized"
                },
                // Legacy: string tokens
                "Platform Capability→Developed"
              ],
              
              "alphaInstances": [
                {
                  "kind": "alphaInstance",
                  "name": "Production VPC",
                  "description": "VPC instance at this pattern view",
                  "alphaName": "Cloud Resource",
                  "stateName": "Conceptualized",
                  
                  "evidenceBy": [
                    {
                      "kind": "workProductInstance",
                      "name": "VPC Terraform Module",
                      "description": "Terraform code for VPC",
                      "workProductName": "Infrastructure Code",
                      "levelOfDetailName": "Outlined"
                    }
                  ]
                }
              ],
              
              "activitySpaces": [
                "Cloud Resource Management"  // Symbolic links
              ],
              
              "activities": [
                "Provision Cloud Resources"  // Symbolic links
              ],
              
              "narrativeContexts": [
                {
                  "seq": 1,
                  "narrativeElementName": "Discovery",
                  "context": "Team identifies need for production VPC"
                }
              ]
            },
            {
              "kind": "patternView",
              "name": "Production Operation",
              "description": "Operational phase",
              "seq": 2,
              "alphaStates": [ /* ... */ ],
              "activitySpaces": [ /* ... */ ],
              "activities": [ /* ... */ ],
              "narratives": [ /* ... */ ]
            }
            // Minimum 1 pattern view required
          ]
        }
      ],
      
      "competencies": [ /* additional competencies */ ],
      "narrativeTypes": [ /* additional narrative types */ ],
      "citations": [ /* additional citations */ ],
      
      "authors": ["Practice Author"],
      "createdAt": "2026-02-01",
      "updatedAt": "2026-06-11",
      "version": "1.0.0",
      "keywords": ["cloud", "infrastructure"]
    }
  ],
  
  // Option 2: String references to practices
  // "practiceNames": [
  //   "Cloud Infrastructure Practice",
  //   "Security Practice"
  // ],
  
  // === METHOD-LEVEL CITATIONS ===
  // Merged from baseline + all practices
  "citations": [
    {
      "kind": "citation",
      "name": "method-level-citation",
      "description": "Citation defined at method level",
      "authors": ["Author Name"],
      "date": "2026",
      "source": "Publisher",
      "url": "https://example.com"
    }
  ]
}
```

---

## Narrative Structure (Detailed)

Narratives can appear on any practice element (shown in detail here, abbreviated elsewhere):

```json
{
  "narratives": [
    {
      "kind": "narrative",
      "name": "Platform Adoption Story",
      "description": "How this element fits in platform adoption journey",
      
      "narrativeTypeName": "Platform Journey",  // Links to NarrativeType
      
      "narrativeContexts": [
        {
          "seq": 1,
          "narrativeElementName": "Discovery",  // Links to NarrativeElement
          "context": "Engineering team realizes manual infrastructure is bottleneck"
        },
        {
          "seq": 2,
          "narrativeElementName": "Adoption",
          "context": "First team migrates to platform capabilities"
        }
      ],
      
      "citationNames": [
        "team-topologies"  // Optional: links to Citation objects
      ]
    }
  ]
}
```

---

## Key Points

### Composition Patterns

1. **Fully Embedded**: All objects inline (good for exports/snapshots)
2. **Fully Symbolic**: String references only (compact, requires resolution)
3. **Hybrid**: Mix embedded baseline + symbolic practices (common pattern)

### Merge Semantics

When Method is resolved/merged:

- **Baseline** provides foundation (focuses, alphas, activity spaces, competencies)
- **Practices** extend/overlay baseline (union arrays by name)
- **Tags** merge by bucket (domainTags, lifecycleTags, organizationalTags)
- **Descriptions** preserve hierarchy (baseline > practice extensions)
- **Citations** aggregate from all sources

### Symbolic Links

String references use **name-based lookup**:

- `alphaName` → `Alpha.name`
- `focusName` → `Focus.name`
- `workProductName` → `WorkProduct.name`
- `competencyName` → `Competency.name`
- `narrativeTypeName` → `NarrativeType.name`

All must resolve within the merged method scope.

### Validation

- Root `kind` discriminates Method vs Practice vs PracticeBaseline
- Method requires **either** `baselinePractice` **or** `baselinePracticeName` (not both)
- Alphas require minimum 3 states
- Work products require minimum 2 levels of detail
- All symbolic references must be valid within method scope

---

## Minimal Valid Method

```json
{
  "kind": "method",
  "name": "Minimal Method",
  "description": "Smallest valid method",
  
  "baselinePracticeName": "Some Baseline",
  
  "practiceNames": [
    "Some Practice"
  ]
}
```

This assumes baseline and practices exist in the library and will be resolved at runtime.
