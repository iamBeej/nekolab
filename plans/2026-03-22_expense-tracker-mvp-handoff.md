# NekoLab MVP — Coding Agent Handoff

## 1. Project Overview

This system is a **command-based personal expense tracking backend** designed to:

- capture structured expense data
- maintain consistent state
- provide basic summaries for decision-making

This is **NOT a full app**, UI, or AI system.

---

## 2. Scope (STRICT)

### Included

- Expense logging
- Person tracking
- Basic totals (per person, overall)
- Persistent storage
- Deterministic processing

### Excluded

- AI / NLP
- Mobile UI
- Charts / dashboards
- External integrations (Gmail, Calendar, etc.)
- Other domains (tasks, plans, income)

---

## 3. Input Specification

### Supported Command

#### Add Expense

Format:
`expense add | person:<name> | category:<text> | amount:<number> | item:<text> | notes:<text>`

Example:
`expense add | person:Juliet | category:food | amount:500 | item:groceries | notes:weekly market run`

---

#### Get Total (Per Person)

`expense total | person:<name>`

---

#### Get Overall Total

`expense total`

---

## 4. Data Model

### Expense

- person: string (required)
- category: string (required)
- amount: number (required)
- item: string (required)
- notes: string (required)
- timestamp: datetime (auto-generated)

---

### Person

- name: string (unique identifier)

---

## 5. Processing Flow

Input → Validate → Parse → Store → Compute → Output

### Validation Rules

- Reject if any required field is missing
- Reject if amount is not numeric
- Person names should be treated consistently (case-sensitive or normalized)

---

## 6. Storage Rules

- Data must be persistent across runs
- Each expense is stored as a new record (append-only)
- No overwriting existing records

---

## 7. Output Specification

### After Adding Expense

Format:

```text
[OK] Expense added
<person> total: ₱<amount>
```

Example:

```text
[OK] Expense added
Juliet total: ₱3500
```

---

### Get Total (Per Person)

Format:
`<person> total expenses: ₱<amount>`

---

### Get Overall Total

Format:
`Total expenses: ₱<amount>`

---

## 8. Time Handling

- Every expense must include a timestamp
- Default queries are all-time totals
- Time-based filtering is NOT required in MVP

---

## 9. System Constraints

- Deterministic behavior only (same input = same output)
- No natural language parsing
- No automation or background tasks
- No external API calls

---

## 10. Success Criteria

- User can log an expense in <10 seconds
- Data remains consistent and structured
- Totals are always accurate
- System behavior is predictable

---

## 11. Non-Goals

Do NOT implement:

- charts or visualization
- dashboards or UI
- authentication
- multi-user support
- advanced analytics

---

## 12. Expected Outcome

A working system where:

- user inputs structured commands
- expenses are stored reliably
- totals can be queried instantly
- system is ready for future extension (mobile, analytics, AI)

---

## 13. Implementation Context

- This project already exists in a repository: NekoLab
- Follow the current project structure and conventions
- Do NOT restructure the repository unless necessary
- Place logic in appropriate modules (e.g., core, integrations, scripts)

---

## 14. Execution Requirement

- Provide a single entry point to run the system
- System must accept command input and return output immediately
- No background processes

---

## 15. Development Constraints

- Implement only the defined MVP scope
- Do NOT add extra features
- Keep changes minimal and isolated
- Maintain modular and readable code

---

## 16. Output Consistency

- Output format must strictly match the specification
- Do not add extra text or formatting beyond defined outputs

---

## 17. Future Extensions (DO NOT IMPLEMENT IN MVP)

The following features are planned but must NOT be implemented yet:

### Income / Paychecks

- Ability to log income entries (e.g., salary, payments)
- Will follow a similar structure to expenses
- Used later for net balance and financial insights

---

### File / Image Inputs

- Ability to attach or process images (e.g., receipts)
- Intended for future OCR or reference storage
- Not required in MVP

---

### Multi-Domain Expansion

- Tasks / Plans
- Calendar events
- Notifications

---

### AI / Natural Language Input

- Flexible input parsing
- Knowledge-based responses

---

## Rule

These features must NOT be implemented until:

- Expense tracking is stable
- Data model is validated
- Core system is fully deterministic

---
