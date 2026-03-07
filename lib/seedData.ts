import type {
  AttachmentRecord,
  AuthSession,
  AuditEvent,
  CaseRecord,
  Entity,
  PasswordResetRequest,
  Relationship,
  ReportRecord,
  UserAccount,
  UserContext,
} from "@/lib/types";

/**
 * Seed data for the prototype.
 *
 * Why seeded data matters:
 * - Lets beginners explore realistic flows before backend is ready.
 * - Creates reproducible demos for Link Analysis and case walkthroughs.
 */

export const seededCases: CaseRecord[] = [
  {
    id: "case-atl-001",
    name: "Metro Corridor Coordination - Denver",
    status: "open",
    jurisdiction: "Denver Metro",
    priority: "high",
    ownerId: "analyst-1",
    reviewDate: "2026-03-15",
    tags: ["denver", "transport", "multi-jurisdiction"],
  },
  {
    id: "case-dfw-002",
    name: "Hospitality Cluster Signals",
    status: "monitoring",
    jurisdiction: "DFW Region",
    priority: "medium",
    ownerId: "analyst-2",
    reviewDate: "2026-03-20",
    tags: ["hospitality", "pattern-of-life"],
  },
  {
    id: "case-phx-003",
    name: "Interstate Movement Review",
    status: "open",
    jurisdiction: "Phoenix Corridor",
    priority: "high",
    ownerId: "analyst-3",
    reviewDate: "2026-03-24",
    tags: ["interstate", "financial"],
  },
];

const case1 = "case-atl-001";

const seededEntityGeo: Record<string, { lat: number; lon: number; address: string }> = {
  e1: { lat: 39.7398, lon: -104.9903, address: "1701 Wynkoop St, Denver, CO 80202" },
  e2: { lat: 39.7422, lon: -104.9849, address: "1624 Market St, Denver, CO 80202" },
  e3: { lat: 39.7444, lon: -104.9806, address: "1400 California St, Denver, CO 80202" },
  e4: { lat: 39.7412, lon: -104.9922, address: "1801 Wewatta St, Denver, CO 80202" },
  e5: { lat: 39.7369, lon: -104.9981, address: "1201 16th St, Denver, CO 80202" },
  e6: { lat: 39.7339, lon: -104.9896, address: "900 Lincoln St, Denver, CO 80203" },
  e7: { lat: 39.7324, lon: -104.9884, address: "951 Lincoln St, Denver, CO 80203" },
  e8: { lat: 39.7391, lon: -104.9742, address: "1391 N Speer Blvd, Denver, CO 80204" },
  e9: { lat: 39.7514, lon: -104.9991, address: "1700 Wewatta St, Denver, CO 80202" },
  e10: { lat: 39.7571, lon: -104.9868, address: "3700 Blake St, Denver, CO 80205" },
  e11: { lat: 39.7416, lon: -104.9782, address: "1550 Larimer St, Denver, CO 80202" },
  e12: { lat: 39.7387, lon: -104.9862, address: "1437 Bannock St, Denver, CO 80202" },
  e13: { lat: 39.7297, lon: -104.9811, address: "901 E Colfax Ave, Denver, CO 80218" },
  e14: { lat: 39.7269, lon: -104.9758, address: "1200 E Colfax Ave, Denver, CO 80218" },
  e15: { lat: 39.7474, lon: -104.9926, address: "1600 Stout St, Denver, CO 80202" },
  e16: { lat: 39.7441, lon: -105.0017, address: "1660 Federal Blvd, Denver, CO 80204" },
  e17: { lat: 39.7402, lon: -105.0062, address: "1200 Decatur St, Denver, CO 80204" },
  e18: { lat: 39.7597, lon: -104.9639, address: "3500 York St, Denver, CO 80205" },
  e19: { lat: 39.7529, lon: -104.9939, address: "2500 Arkins Ct, Denver, CO 80216" },
  e20: { lat: 39.7356, lon: -104.9951, address: "1000 Broadway, Denver, CO 80203" },
  e21: { lat: 39.7466, lon: -104.9703, address: "2200 Lawrence St, Denver, CO 80205" },
  e22: { lat: 39.7483, lon: -104.9679, address: "2500 Lawrence St, Denver, CO 80205" },
  e23: { lat: 39.7343, lon: -104.9584, address: "3600 Walnut St, Denver, CO 80205" },
  e24: { lat: 39.7429, lon: -104.9567, address: "3500 Brighton Blvd, Denver, CO 80216" },
  e25: { lat: 39.7378, lon: -104.9535, address: "3360 Downing St, Denver, CO 80205" },
};

const rawSeededEntities: Entity[] = [
  { id: "e1", caseId: case1, type: "person", displayName: "Jordan Hale", aliases: ["JH"], confidence: 0.91, protectedFlag: false, descriptors: ["frequent traveler"] },
  { id: "e2", caseId: case1, type: "suspect", displayName: "Avery Cole", aliases: ["AC"], confidence: 0.84, protectedFlag: false, descriptors: ["night-shift activity"] },
  { id: "e3", caseId: case1, type: "victim", displayName: "Protected Individual A", aliases: ["PI-A"], confidence: 0.96, protectedFlag: true, descriptors: ["support workflow"] },
  { id: "e4", caseId: case1, type: "phone", displayName: "+1-303-555-0101", aliases: [], confidence: 0.93, protectedFlag: false, descriptors: ["high volume messaging"] },
  { id: "e5", caseId: case1, type: "phone", displayName: "+1-303-555-0102", aliases: [], confidence: 0.87, protectedFlag: false, descriptors: ["late-night bursts"] },
  { id: "e6", caseId: case1, type: "vehicle", displayName: "Gray SUV CO-24K9", aliases: ["SUV-24K9"], confidence: 0.79, protectedFlag: false, descriptors: ["plate sightings"] },
  { id: "e7", caseId: case1, type: "license_plate", displayName: "CO-24K9", aliases: [], confidence: 0.9, protectedFlag: false, descriptors: ["state records"] },
  { id: "e8", caseId: case1, type: "location", displayName: "Colfax Corridor Motel", aliases: ["Site CCM"], confidence: 0.82, protectedFlag: false, descriptors: ["repeat co-location"] },
  { id: "e9", caseId: case1, type: "location", displayName: "Union Station Transit Hub", aliases: [], confidence: 0.8, protectedFlag: false, descriptors: ["travel node"] },
  { id: "e10", caseId: case1, type: "organization", displayName: "Front Range Transit LLC", aliases: ["FRT"], confidence: 0.75, protectedFlag: false, descriptors: ["logistics shell"] },
  { id: "e11", caseId: case1, type: "account", displayName: "Payment Handle #4382", aliases: [], confidence: 0.77, protectedFlag: false, descriptors: ["recurring transfers"] },
  { id: "e12", caseId: case1, type: "document", displayName: "Shared Itinerary Sheet", aliases: [], confidence: 0.72, protectedFlag: false, descriptors: ["attachment extracted"] },
  { id: "e13", caseId: case1, type: "unknown_person", displayName: "Unknown Male 01", aliases: ["UM-01"], confidence: 0.52, protectedFlag: false, descriptors: ["needs identification"] },
  { id: "e14", caseId: case1, type: "unknown_person", displayName: "Unknown Female 02", aliases: ["UF-02"], confidence: 0.49, protectedFlag: false, descriptors: ["possible duplicate"] },
  { id: "e15", caseId: case1, type: "email", displayName: "coordination-mail@sample.net", aliases: [], confidence: 0.74, protectedFlag: false, descriptors: ["forwarding pattern"] },
  { id: "e16", caseId: case1, type: "person", displayName: "Casey Morgan", aliases: ["CM"], confidence: 0.67, protectedFlag: false, descriptors: ["broker indicator"] },
  { id: "e17", caseId: case1, type: "associate", displayName: "Riley Stone", aliases: [], confidence: 0.63, protectedFlag: false, descriptors: ["shared lodging"] },
  { id: "e18", caseId: case1, type: "location", displayName: "Northside Clinic Denver", aliases: ["NC-12"], confidence: 0.88, protectedFlag: true, descriptors: ["protected services"] },
  { id: "e19", caseId: case1, type: "document", displayName: "Driver Log Export", aliases: [], confidence: 0.7, protectedFlag: false, descriptors: ["imported csv"] },
  { id: "e20", caseId: case1, type: "vehicle", displayName: "White Sedan CO-77P1", aliases: [], confidence: 0.68, protectedFlag: false, descriptors: ["rental transitions"] },
  { id: "e21", caseId: case1, type: "person", displayName: "Jamie Rivers", aliases: ["JR"], confidence: 0.71, protectedFlag: false, descriptors: ["duplicate candidate A"] },
  { id: "e22", caseId: case1, type: "person", displayName: "J. Rivers", aliases: ["Jamie R"], confidence: 0.58, protectedFlag: false, descriptors: ["duplicate candidate B"] },
  { id: "e23", caseId: case1, type: "location", displayName: "RiNo Warehouse Unit 5", aliases: [], confidence: 0.62, protectedFlag: false, descriptors: ["supply staging"] },
  { id: "e24", caseId: case1, type: "organization", displayName: "Mile High Services", aliases: ["MHS"], confidence: 0.55, protectedFlag: false, descriptors: ["service intermediary"] },
  { id: "e25", caseId: case1, type: "account", displayName: "Wallet-X9", aliases: [], confidence: 0.65, protectedFlag: false, descriptors: ["small transfer cluster"] },
];

export const seededEntities: Entity[] = rawSeededEntities.map((entity) => ({
  ...entity,
  geo: seededEntityGeo[entity.id],
}));

export const seededRelationships: Relationship[] = [
  { id: "r1", caseId: case1, fromEntityId: "e1", toEntityId: "e4", type: "communication", strength: "high", confidence: 0.91, sourceCount: 8 },
  { id: "r2", caseId: case1, fromEntityId: "e2", toEntityId: "e5", type: "communication", strength: "medium", confidence: 0.78, sourceCount: 5 },
  { id: "r3", caseId: case1, fromEntityId: "e1", toEntityId: "e8", type: "co_location", strength: "high", confidence: 0.88, sourceCount: 9 },
  { id: "r4", caseId: case1, fromEntityId: "e2", toEntityId: "e8", type: "co_location", strength: "medium", confidence: 0.75, sourceCount: 4 },
  { id: "r5", caseId: case1, fromEntityId: "e4", toEntityId: "e11", type: "financial", strength: "medium", confidence: 0.69, sourceCount: 3 },
  { id: "r6", caseId: case1, fromEntityId: "e6", toEntityId: "e7", type: "association", strength: "high", confidence: 0.93, sourceCount: 7 },
  { id: "r7", caseId: case1, fromEntityId: "e6", toEntityId: "e8", type: "co_location", strength: "medium", confidence: 0.66, sourceCount: 2 },
  { id: "r8", caseId: case1, fromEntityId: "e10", toEntityId: "e19", type: "association", strength: "low", confidence: 0.55, sourceCount: 2 },
  { id: "r9", caseId: case1, fromEntityId: "e13", toEntityId: "e9", type: "co_location", strength: "low", confidence: 0.43, sourceCount: 1 },
  { id: "r10", caseId: case1, fromEntityId: "e14", toEntityId: "e9", type: "co_location", strength: "low", confidence: 0.41, sourceCount: 1 },
  { id: "r11", caseId: case1, fromEntityId: "e15", toEntityId: "e10", type: "association", strength: "medium", confidence: 0.61, sourceCount: 3 },
  { id: "r12", caseId: case1, fromEntityId: "e1", toEntityId: "e16", type: "contact", strength: "medium", confidence: 0.7, sourceCount: 3 },
  { id: "r13", caseId: case1, fromEntityId: "e16", toEntityId: "e17", type: "association", strength: "medium", confidence: 0.67, sourceCount: 3 },
  { id: "r14", caseId: case1, fromEntityId: "e3", toEntityId: "e18", type: "association", strength: "high", confidence: 0.92, sourceCount: 6 },
  { id: "r15", caseId: case1, fromEntityId: "e20", toEntityId: "e8", type: "co_location", strength: "medium", confidence: 0.63, sourceCount: 2 },
  { id: "r16", caseId: case1, fromEntityId: "e21", toEntityId: "e22", type: "association", strength: "low", confidence: 0.45, sourceCount: 1 },
  { id: "r17", caseId: case1, fromEntityId: "e21", toEntityId: "e1", type: "contact", strength: "low", confidence: 0.5, sourceCount: 1 },
  { id: "r18", caseId: case1, fromEntityId: "e22", toEntityId: "e2", type: "contact", strength: "low", confidence: 0.47, sourceCount: 1 },
  { id: "r19", caseId: case1, fromEntityId: "e23", toEntityId: "e24", type: "association", strength: "medium", confidence: 0.57, sourceCount: 2 },
  { id: "r20", caseId: case1, fromEntityId: "e24", toEntityId: "e25", type: "financial", strength: "medium", confidence: 0.6, sourceCount: 3 },
  { id: "r21", caseId: case1, fromEntityId: "e11", toEntityId: "e25", type: "financial", strength: "medium", confidence: 0.65, sourceCount: 3 },
  { id: "r22", caseId: case1, fromEntityId: "e12", toEntityId: "e10", type: "association", strength: "low", confidence: 0.5, sourceCount: 2 },
  { id: "r23", caseId: case1, fromEntityId: "e19", toEntityId: "e23", type: "association", strength: "low", confidence: 0.46, sourceCount: 1 },
  { id: "r24", caseId: case1, fromEntityId: "e4", toEntityId: "e15", type: "communication", strength: "medium", confidence: 0.71, sourceCount: 4 },
  { id: "r25", caseId: case1, fromEntityId: "e5", toEntityId: "e15", type: "communication", strength: "low", confidence: 0.55, sourceCount: 2 },
  { id: "r26", caseId: case1, fromEntityId: "e6", toEntityId: "e20", type: "association", strength: "low", confidence: 0.52, sourceCount: 2 },
  { id: "r27", caseId: case1, fromEntityId: "e1", toEntityId: "e3", type: "contact", strength: "low", confidence: 0.42, sourceCount: 1 },
  { id: "r28", caseId: case1, fromEntityId: "e2", toEntityId: "e3", type: "contact", strength: "low", confidence: 0.4, sourceCount: 1 },
  { id: "r29", caseId: case1, fromEntityId: "e8", toEntityId: "e9", type: "association", strength: "medium", confidence: 0.62, sourceCount: 3 },
  { id: "r30", caseId: case1, fromEntityId: "e16", toEntityId: "e11", type: "financial", strength: "medium", confidence: 0.66, sourceCount: 3 },
  { id: "r31", caseId: case1, fromEntityId: "e17", toEntityId: "e8", type: "co_location", strength: "low", confidence: 0.51, sourceCount: 2 },
  { id: "r32", caseId: case1, fromEntityId: "e13", toEntityId: "e14", type: "association", strength: "low", confidence: 0.39, sourceCount: 1 },
  { id: "r33", caseId: case1, fromEntityId: "e18", toEntityId: "e8", type: "co_location", strength: "low", confidence: 0.44, sourceCount: 1 },
  { id: "r34", caseId: case1, fromEntityId: "e12", toEntityId: "e19", type: "association", strength: "low", confidence: 0.53, sourceCount: 2 },
  { id: "r35", caseId: case1, fromEntityId: "e23", toEntityId: "e8", type: "co_location", strength: "low", confidence: 0.48, sourceCount: 2 },
  { id: "r36", caseId: case1, fromEntityId: "e24", toEntityId: "e10", type: "association", strength: "low", confidence: 0.54, sourceCount: 2 },
  { id: "r37", caseId: case1, fromEntityId: "e22", toEntityId: "e15", type: "communication", strength: "low", confidence: 0.44, sourceCount: 1 },
  { id: "r38", caseId: case1, fromEntityId: "e21", toEntityId: "e4", type: "communication", strength: "low", confidence: 0.43, sourceCount: 1 },
  { id: "r39", caseId: case1, fromEntityId: "e25", toEntityId: "e4", type: "financial", strength: "low", confidence: 0.45, sourceCount: 1 },
  { id: "r40", caseId: case1, fromEntityId: "e20", toEntityId: "e9", type: "co_location", strength: "low", confidence: 0.5, sourceCount: 2 },
];

export const seededReports: ReportRecord[] = Array.from({ length: 30 }).map((_, i) => {
  const entityA = `e${(i % 25) + 1}`;
  const entityB = `e${((i + 6) % 25) + 1}`;
  const sourceTypes: ReportRecord["sourceType"][] = [
    "open_source",
    "partner_submission",
    "field_observation",
    "internal_note",
  ];

  return {
    id: `rep-${String(i + 1).padStart(3, "0")}`,
    caseId: case1,
    timeObserved: new Date(Date.UTC(2026, 1, 1 + i, 14, i % 60, 0)).toISOString(),
    location: ["Colfax Corridor Motel", "Union Station Transit Hub", "RiNo Warehouse Unit 5", "Northside Clinic Denver"][i % 4],
    narrative: `Sample report ${i + 1}: observed activity connecting ${entityA} and ${entityB}. This is synthetic training data only.`,
    sourceType: sourceTypes[i % sourceTypes.length],
    relatedEntityIds: [entityA, entityB],
  };
});

export const seededAttachments: AttachmentRecord[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `att-${String(i + 1).padStart(3, "0")}`,
  parentType: i % 2 === 0 ? "report" : "entity",
  parentId: i % 2 === 0 ? `rep-${String((i % 30) + 1).padStart(3, "0")}` : `e${(i % 25) + 1}`,
  fileType: ["image", "pdf", "spreadsheet", "note"][i % 4] as AttachmentRecord["fileType"],
  storagePath: `/blob/mock/att-${String(i + 1).padStart(3, "0")}`,
}));

export const seededAuditEvents: AuditEvent[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `audit-${String(i + 1).padStart(3, "0")}`,
  actorId: i % 2 === 0 ? "analyst-1" : "supervisor-1",
  actionType: ["view", "filter", "edit_relationship", "export_briefing"][i % 4],
  objectType: ["case", "entity", "relationship", "briefing"][i % 4],
  objectId: i % 4 === 2 ? `r${(i % 40) + 1}` : `obj-${i + 1}`,
  timestamp: new Date(Date.UTC(2026, 1, 1 + i, 10, i % 60, 0)).toISOString(),
  metadata: { synthetic: true },
}));

export const demoUserContext: UserContext = {
  isAuthenticated: true,
  userId: "analyst-1",
  email: "analyst@demo.local",
  displayName: "Demo Analyst",
  role: "analyst",
  assignedRoles: ["analyst"],
  permissions: ["case.read", "entity.read", "relationship.write", "report.read", "report.write"],
  compartments: ["general"],
};

const demoPasswordHash = "a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea";

export const seededUsers: UserAccount[] = [
  {
    id: "analyst-1",
    displayName: "Demo Analyst",
    email: "analyst@demo.local",
    passwordHash: demoPasswordHash,
    assignedRoles: ["analyst"],
    defaultRole: "analyst",
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "operator-1",
    displayName: "Demo Operator",
    email: "operator@demo.local",
    passwordHash: demoPasswordHash,
    assignedRoles: ["operator"],
    defaultRole: "operator",
    createdAt: "2026-02-01T10:05:00.000Z",
    updatedAt: "2026-02-01T10:05:00.000Z",
  },
  {
    id: "supervisor-1",
    displayName: "Demo Supervisor",
    email: "supervisor@demo.local",
    passwordHash: demoPasswordHash,
    assignedRoles: ["supervisor"],
    defaultRole: "supervisor",
    createdAt: "2026-02-01T10:10:00.000Z",
    updatedAt: "2026-02-01T10:10:00.000Z",
  },
  {
    id: "command-1",
    displayName: "Command Lead",
    email: "command@demo.local",
    passwordHash: demoPasswordHash,
    assignedRoles: ["analyst", "operator", "supervisor"],
    defaultRole: "supervisor",
    createdAt: "2026-02-01T10:15:00.000Z",
    updatedAt: "2026-02-01T10:15:00.000Z",
  },
];

export const seededSessions: AuthSession[] = [];

export const seededPasswordResetRequests: PasswordResetRequest[] = [];
