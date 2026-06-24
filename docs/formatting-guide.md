# General Formatting Rules for PracticeElements

* x = Heading level, sub-level to parent heading

H`x`. `PracticeElement.name`
`embedImage(findAssetsOfType(PracticeElement.assetNames,type="icon")) PracticeElement.description`

```
for each assetName in PracticeElement.assetNames
  if assetName.type <> "icon"
    asset = findAssetByName(assetName.assetName)
    <p align="centre">
    embedImage(asset,altText=asset.name + ": "+asset.description)
    </p>
```

`for each narrative in PracticeElement.narratives`
H`(x+1)`. `narrative.name`
`narrative.description`
`for each context in narrative.narrativeContexts`
  > `context.seq`. `context.context`

H`(x+2)`. Further Reading
`for each citationName in narrative.citationNames`
  `citation = findCitationByName(citationName)` 
  * [citationName](citation.url OR IF NULL getCitationAnchor(citationName)) (citation.date)
  
# Headers and Footers

# Header
If a method is present, include the `method.name`
For pages covering a specific practice include the `practice.name`

| :--- | ---: |
| `method.name` | `practice.name` |

# Footer
For pages covering a specific practice include the practice's authors

| :--- | ---: |
| commaDelimList(authors) | `page.number` |



# Practice Element Tiles
A tile is a highlighted block, that acts as a hyperlink to the element's description within the document. 

The standard design should be a rounded rectangle, with the following contents:

`embedImage(findAssetsOfType(PracticeElement.assetNames,type="icon")) PracticeElement.name`

This tile approach should be used for: 
* Alphas
* Work Products
* Patterns
* Activities
* ActivitySpaces
* Competencies
* Personas
* PersonaGroups

## Exceptions

### AlphaContribution
1. Find the alpha
2. Find the alpha state
3. Find a suitable icon
   1. If the alpha state has an asset of type icon, use this
   2. otherwise, if present, use the alpha's asset of type icon

`icon alpha.name -> state.name`

### WorkProductContribution
1. Find the workproduct
2. Find the workproduct levelofdetail
3. Find a suitable icon
   1. If the levelofdetail has an asset of type icon, use this
   2. otherwise, if present, use the workproducts's asset of type icon

`icon workproduct.name -> levelofdetail.name`

### Alpha Instance
1. Find the alpha
2. Find the alpha instance
3. Find a suitable icon
   1. If the alpha instance has an asset of type icon, use this
   2. otherwise, if present, use the alpha's asset of type icon
3. Find the workproduct
4. Find the workproduct levelofdetail
5. Find a suitable icon
   1. If the levelofdetail has an asset of type icon, use this
   2. otherwise, if present, use the workproducts's asset of type icon


```
alpha.icon alphaInstance.name::alpha.name -> stateName
   |- workproduct.icon workProductInstance.name::workProduct.name -> levelOfDetail
```



## Simple
A tile design that simply includes the Alpha's name

| `alpha.name` |
| --- |

## Descriptive
A tile design that includes the Alpha's name, centred, and then the alpha description, left justified. 

| :--------------: |
| **`alpha.name`** |
| :--------------  |
| `alpha.description` |
| --- |

## Alpha State

| **`alpha.name`** |
| `alpha.states[x].name` |
| --- |


# Practice / Method focus
Horizontal swimlanes, one for each Focus

Each swimlane should include baselinePractice alphas that are associated with the focus using the `Alpha Cards.Simple` design

