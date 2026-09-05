export interface AuditEvent {
  id: string;
  userId: string;
  projectId?: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const auditLog: AuditEvent[] = [];

export function logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const entry: AuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(entry);
  if (auditLog.length > 1000) auditLog.shift();
  return entry;
}

export function getAuditLog(filters?: { userId?: string; projectId?: string; action?: string; limit?: number }): AuditEvent[] {
  let events = [...auditLog];
  if (filters?.userId) events = events.filter((e) => e.userId === filters.userId);
  if (filters?.projectId) events = events.filter((e) => e.projectId === filters.projectId);
  if (filters?.action) events = events.filter((e) => e.action === filters.action);
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filters?.limit) events = events.slice(0, filters.limit);
  return events;
}
