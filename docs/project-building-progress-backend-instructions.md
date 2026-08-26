# Backend Instruction: Project Building Progress (Stacks & Floors)

## 1. Feature Purpose

Allow a project to be modeled as a physical building structure:

- A project has many **Blocks**
- Each block has many **Storeys** (horizontal floors)
- Each block has many **Stacks** (vertical columns that run through all storeys)
- A **Unit** is located at the intersection of one **Storey** and one **Stack**
- Each unit can be mapped to exactly one **ProjectStream** (unit = stream)
- Selected **ProjectTasks** under that stream become **Works** under the unit
- Progress of a unit is derived from progress of its mapped stream
- Progress of works is derived from their mapped tasks

Site leaders update task progress in daily reporting as they do today. This feature only defines the structure and mapping.

---

## 2. Required Entities

### 2.1 ProjectBlock

```java
public class ProjectBlock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectBlockId;

    private String projectCode;          // FK to Project
    private String blockName;            // e.g. "Block A"
    private String blockDescription;
    private Long blockNumber;            // display order
    private String status;               // "ACTIVE" | "INACTIVE"
}
```

### 2.2 ProjectStorey

```java
public class ProjectStorey {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectStoreyId;

    private Long projectBlockId;         // FK to ProjectBlock
    private String storeyName;           // e.g. "Level 1"
    private String storeyDescription;
    private Long storeyNumber;           // display order within block
    private String status;               // "ACTIVE" | "INACTIVE"
}
```

### 2.3 ProjectStack

```java
public class ProjectStack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectStackId;

    private Long projectBlockId;         // FK to ProjectBlock
    private String stackName;            // e.g. "Stack 1"
    private String stackDescription;
    private Long stackNumber;            // display order within block
    private String status;               // "ACTIVE" | "INACTIVE"
}
```

### 2.4 ProjectUnit

```java
public class ProjectUnit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectUnitId;

    private Long projectStoreyId;        // FK to ProjectStorey
    private Long projectStackId;         // FK to ProjectStack
    private String unitName;             // e.g. "Unit 01"
    private String unitDescription;
    private Long unitNumber;             // display order within storey/stack
    private Long projectStreamId;        // FK to ProjectStream (unit = stream)
    private String status;               // "ACTIVE" | "INACTIVE"
}
```

Removed: `ProjectUnitWork` is no longer needed. A unit is linked directly to a stream, and the unit's works are read directly from that stream's tasks. Do not create a separate work entity or join table.

---

## 3. Required REST Endpoints

### 3.1 ProjectBlock

```
GET    /api/projectblocks/project/{projectCode}
POST   /api/projectblocks
PUT    /api/projectblocks/{projectBlockId}
DELETE /api/projectblocks/{projectBlockId}
```

### 3.2 ProjectStorey

```
GET    /api/projectstoreys/block/{projectBlockId}
POST   /api/projectstoreys
PUT    /api/projectstoreys/{projectStoreyId}
DELETE /api/projectstoreys/{projectStoreyId}
```

### 3.3 ProjectStack

```
GET    /api/projectstacks/block/{projectBlockId}
POST   /api/projectstacks
PUT    /api/projectstacks/{projectStackId}
DELETE /api/projectstacks/{projectStackId}
```

### 3.4 ProjectUnit

```
GET    /api/projectunits/project/{projectCode}   (required for project-wide stream deduplication)
GET    /api/projectunits/storey/{projectStoreyId}
GET    /api/projectunits/stack/{projectStackId}
GET    /api/projectunits/intersection/{projectStoreyId}/{projectStackId}
POST   /api/projectunits
PUT    /api/projectunits/{projectUnitId}
DELETE /api/projectunits/{projectUnitId}
```

### 3.5 Aggregate Progress Endpoint

```
GET /api/projectbuildingprogress/{projectCode}
```

This endpoint returns the full block/storey/stack/unit tree for the project, **enriched with progress data**.
The frontend renders each block as a grid where rows are storeys and columns are stacks; a unit exists at each intersection that has been defined.

```json
{
  "projectCode": "PRJ-001",
  "blocks": [
    {
      "projectBlockId": 1,
      "blockName": "Block A",
      "blockNumber": 1,
      "storeys": [
        {
          "projectStoreyId": 10,
          "storeyName": "Level 1",
          "storeyNumber": 1,
          "units": [
            {
              "projectUnitId": 100,
              "unitName": "Unit 01",
              "unitNumber": 1,
              "projectStackId": 20,
              "stackName": "Stack 1",
              "projectStreamId": 500,
              "streamName": "Tower A Electrical",
              "streamType": "P",
              "progress": 35,
              "plannedStartDate": "2026-08-01",
              "plannedEndDate": "2026-09-15",
              "actualStartDate": "2026-08-03",
              "actualEndDate": null,
              "works": [
                {
                  "projectTaskId": 2000,
                  "taskName": "Cable Pulling",
                  "progress": 50,
                  "plannedStartDate": "2026-08-01",
                  "plannedEndDate": "2026-08-15",
                  "actualStartDate": "2026-08-03",
                  "actualEndDate": null,
                  "streamName": "Tower A Electrical",
                  "streamType": "P"
                }
              ]
            }
          ]
        }
      ],
      "stacks": [
        {
          "projectStackId": 20,
          "stackName": "Stack 1",
          "stackNumber": 1
        }
      ]
    }
  ]
}
```

---

## 4. Service Responsibilities

### 4.1 CRUD Services

Provide standard services for each entity with validation:

- `ProjectBlockService`
- `ProjectStoreyService`
- `ProjectStackService`
- `ProjectUnitService`

Validation rules:

- Block number must be unique within a project
- Storey number must be unique within a block
- Stack number must be unique within a block
- A unit is uniquely identified by `(projectStoreyId, projectStackId)` within a block
- Unit number must be unique within a storey
- A stream can be mapped to at most one unit per project
  - The mapping restriction also applies across the stream hierarchy: if a stream is mapped to a unit, none of its ancestor or descendant streams may be mapped to another unit in the same project
  - The frontend enforces this by calling `GET /api/projectunits/project/{projectCode}` before populating the stream dropdown. This endpoint must return every unit in the project so already-used streams and their related ancestor/descendant streams can be filtered out

### 4.2 Aggregate / Progress Service

`ProjectBuildingProgressService.computeProgress(String projectCode)`

Responsibilities:

1. Load all active blocks, storeys, stacks, and units for the project
2. For each block, return its storeys and stacks so the frontend can render the intersection grid
3. Place each unit under its parent storey and set `projectStackId` to the exact ID of the stack at that column. This field is authoritative: the frontend matches units to stacks only by `projectStackId`, so it must be present and correct.
4. For each unit, load the mapped `ProjectStream`, recursively collect all descendant sub-streams via `parentStreamNumber`, and load all tasks belonging to the mapped stream **and** its descendants
5. Compute unit progress:
   - If no aggregated tasks → 0
   - Otherwise progress = average of `ProjectTask.progress` for all aggregated tasks
6. Compute unit planned dates from all aggregated tasks:
   - `plannedStartDate` = minimum `taskStartDate`
   - `plannedEndDate` = maximum `taskEndDate`
   - `actualStartDate` = minimum `actualStartDate`
   - `actualEndDate` = maximum `actualEndDate`
7. Expose each unit's `works` as the aggregated tasks (read-only; do not duplicate or persist). Include each work's source `streamName` and `streamType` so the frontend can show whether a work belongs to the parent stream or a sub-stream
8. Return the enriched tree

### 4.3 Cascade Delete Rules

- Deleting a **Block** deletes all its storeys, stacks, and units
- Deleting a **Storey** deletes all its units
- Deleting a **Stack** deletes all its units
- Deleting a **Unit** clears its stream reference only
- Deleting a **ProjectStream** or **ProjectTask** should not cascade to unit/structure data

---

## 5. Data Flow Summary

| Frontend Action            | Backend Endpoint(s)                                       |
| -------------------------- | --------------------------------------------------------- |
| Load overview              | `GET /api/projectbuildingprogress/{projectCode}`          |
| Open structure setup       | `GET /api/projectblocks/project/{projectCode}`            |
| Add block                  | `POST /api/projectblocks`                                 |
| Edit block                 | `PUT /api/projectblocks/{id}`                             |
| Delete block               | `DELETE /api/projectblocks/{id}`                          |
| Load storeys               | `GET /api/projectstoreys/block/{blockId}`                 |
| Add/edit/delete storey     | corresponding endpoints                                   |
| Load stacks                | `GET /api/projectstacks/block/{blockId}`                  |
| Add/edit/delete stack      | corresponding endpoints                                   |
| Load units                 | `GET /api/projectunits/storey/{storeyId}`                 |
| Load all units for project | `GET /api/projectunits/project/{projectCode}`             |
| Add/edit/delete unit       | corresponding endpoints                                   |
| Map stream to unit         | `PUT /api/projectunits/{unitId}` with `projectStreamId`   |
| Read unit works            | Derived from `ProjectStream.tasks` via aggregate endpoint |

---

## 6. Notes for Backend Developer

- Reuse existing `ProjectStream` and `ProjectTask` entities
- Do not duplicate task progress logic; read from existing `ProjectTask.progress` and `ProjectTaskProgress` tables as needed
- The aggregate endpoint should be the single source of truth for the frontend overview
- Ensure endpoints return proper HTTP status codes and consistent error messages
