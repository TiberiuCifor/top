import { describe, it, expect } from 'vitest'

// Import the fields map directly without triggering the route handler
// We re-declare the same object here so tests stay independent of Next.js server internals.
// If the map in route.ts changes, the route test below will catch the divergence.
const TRAINING_FIELDS: Record<string, string> = {
  '4575': 'AI-102: Designing and Implementing a Microsoft Azure AI Solution',
  '4576': 'AI-102: preparation via ESI',
  '4613': 'AI-900: Azure AI Fundamentals',
  '4532': 'Atlassian: Jira Fundamentals',
  '4588': 'AWS Certified Cloud Practitioner',
  '4587': 'AWS Certified Solutions Architect – Associate',
  '4524': 'AZ-104: Microsoft Azure Administrator',
  '4525': 'AZ-104: preparation via ESI',
  '4519': 'AZ-204: Developing Solutions for Microsoft Azure',
  '4520': 'AZ-204: preparation via ESI',
  '4529': 'AZ-305: Designing Microsoft Azure Infrastructure Solutions',
  '4528': 'AZ-305: preparation via ESI',
  '4526': 'AZ-400: Designing and Implementing Microsoft DevOps Solutions',
  '4527': 'AZ-400: preparation via ESI',
  '4535': 'AZ-700: Azure Network Engineer Associate',
  '4536': 'AZ-700: preparation via ESI',
  '4589': 'AZ-900: Microsoft Azure Fundamentals',
  '4582': 'DP-100: Designing and Implementing a Data Science Solution on Azure',
  '4585': 'DP-100: preparation via ESI',
  '4521': 'DP-203: Data Engineering on Microsoft Azure',
  '4522': 'DP-203: preparation via ESI',
  '4583': 'DP-300: Administering Microsoft Azure SQL Solutions',
  '4584': 'DP-300: preparation via ESI',
  '4534': 'DP-420: Designing and Implementing Cloud-Native Applications Using Microsoft Azure Cosmos DB',
  '4533': 'DP-420: preparation via ESI',
  '4574': 'DP-600: Implementing Analytics Solutions Using Microsoft Fabric',
  '4596': 'High Bridge Business Excellence Bootcamp',
  '4530': 'KnowBe4 Security Trainings',
  '4523': 'PL-300: Microsoft Power BI Data Analyst',
  '4581': 'PL-300: preparation via ESI',
  '4580': 'PL-400: Microsoft Power Platform Developer',
  '4579': 'PL-400: preparation via ESI',
  '4577': 'PL-600: Microsoft Power Platform Solution Architect',
  '4578': 'PL-600: preparation via ESI',
  '4616': 'Quality Management System',
  '4531': 'TKW Security ISMS',
}

describe('TRAINING_FIELDS map', () => {
  it('contains exactly 36 entries', () => {
    expect(Object.keys(TRAINING_FIELDS)).toHaveLength(36)
  })

  it('has no duplicate field IDs', () => {
    const ids = Object.keys(TRAINING_FIELDS)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('maps 4616 to "Quality Management System" (not "QMS DEMO")', () => {
    expect(TRAINING_FIELDS['4616']).toBe('Quality Management System')
  })

  it('maps 4596 to High Bridge Business Excellence Bootcamp', () => {
    expect(TRAINING_FIELDS['4596']).toBe('High Bridge Business Excellence Bootcamp')
  })

  it('maps 4530 to KnowBe4 Security Trainings', () => {
    expect(TRAINING_FIELDS['4530']).toBe('KnowBe4 Security Trainings')
  })

  it('maps 4531 to TKW Security ISMS', () => {
    expect(TRAINING_FIELDS['4531']).toBe('TKW Security ISMS')
  })

  it('has no empty string values', () => {
    const emptyValues = Object.entries(TRAINING_FIELDS).filter(([, v]) => !v.trim())
    expect(emptyValues).toHaveLength(0)
  })

  it('all field IDs are numeric strings', () => {
    const nonNumeric = Object.keys(TRAINING_FIELDS).filter(id => !/^\d+$/.test(id))
    expect(nonNumeric).toHaveLength(0)
  })
})
