"use client";

import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Field } from "@/components/ui/freebiz-field";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { VoucherChip } from "@/components/ui/freebiz-voucher-chip";
import { Avatar } from "@/components/ui/freebiz-avatar";
import { Progress } from "@/components/ui/freebiz-progress";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import { Steps } from "@/components/ui/freebiz-steps";

// Phase B verification page (CLAUDE-UI.md) — one of every primitive,
// unwired from any real screen, for a side-by-side check against
// design/freebiz-mockup.html. Not linked from app nav; visit directly.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <p
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--faint)",
          marginBottom: 12,
        }}>
        {title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        {children}
      </div>
    </section>
  );
}

export default function DevUiPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink-900)",
        color: "var(--txt)",
        fontFamily: "var(--body)",
        padding: "40px 30px 80px",
      }}>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: 27,
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}>
        Freebiz primitives
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 36 }}>
        Phase B — one of each, unwired. Compare against design/freebiz-mockup.html.
      </p>

      <Section title="Button — default / primary / ghost / danger">
        <Button>Default</Button>
        <Button variant="primary">Apply code</Button>
        <Button variant="ghost">Pause</Button>
        <Button variant="danger">Suspend brand</Button>
        <Button variant="primary" size="sm">
          Upload new cut
        </Button>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </Section>

      <Section title="Pill — live / warn / bad / info / brandish">
        <Pill dot="pulse" tone="live">
          3,418 watching
        </Pill>
        <Pill tone="warn">Cash prizes running low</Pill>
        <Pill dot tone="bad">
          Sent back
        </Pill>
        <Pill dot tone="info">
          Control room only
        </Pill>
        <Pill dot tone="brandish">
          Premium
        </Pill>
        <Pill dot>Finished</Pill>
      </Section>

      <Section title="Card">
        <Card style={{ width: 280 }}>
          <h3>Recent catches</h3>
          <CardNote>Live feed — every claim on the board.</CardNote>
        </Card>
        <Card tight style={{ width: 200 }}>
          <h3>Tight card</h3>
          <CardNote>Less padding, e.g. a table wrapper.</CardNote>
        </Card>
      </Section>

      <Section title="Stat">
        <Stat label="Codes today" value="142" detail="₦50-₦1,000 cash" />
        <Stat label="Still unclaimed" value="6" valueColor="var(--live)" detail="Refreshed every hour" />
        <Stat label="Your streak" value="9" suffix=" days" detail="Keep showing up" />
      </Section>

      <Section title="Field + Input">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 320 }}>
          <Field label="Apply a code">
            <Input placeholder="Type the code on the board — e.g. FB-9K4T-77" />
          </Field>
          <Field label="What is this ad about?" hint="Reviewers read this. Being specific gets you cleared faster.">
            <Textarea rows={3} defaultValue="Weekend jollof deal for Lagos and Abuja stores." />
          </Field>
        </div>
      </Section>

      <Section title="Table">
        <Card tight style={{ width: "100%" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Campaign</TableHeadCell>
                <TableHeadCell>Slot</TableHeadCell>
                <TableHeadCell>Plays</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell />
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <b>Small chops, big love</b>
                </TableCell>
                <TableCell>
                  <Pill tone="brandish">Premium</Pill>
                </TableCell>
                <TableCell className="fb-num">18,402</TableCell>
                <TableCell>
                  <Pill dot="pulse" tone="live">
                    On the board
                  </Pill>
                </TableCell>
                <TableCell style={{ textAlign: "right" }}>
                  <Button variant="ghost" size="sm">
                    Pause
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="VoucherChip">
        <VoucherChip code="FB-9K4T-77" value="₦2,000" />
        <VoucherChip code="FB-2XQ1-08" used />
      </Section>

      <Section title="Avatar">
        <Avatar initials="B" background="var(--free)" />
        <Avatar initials="T" background="var(--brand)" color="white" />
        <Avatar initials="K" background="var(--live)" />
        <Avatar initials="N" background="var(--admin)" />
      </Section>

      <Section title="Progress">
        <div style={{ width: 220 }}>
          <Progress value={63} />
        </div>
        <div style={{ width: 220 }}>
          <Progress value={38} color="var(--free)" />
        </div>
      </Section>

      <Section title="LimitRow">
        <Card style={{ width: 320 }}>
          <LimitRow label="Premium · 5 Fridays" value="₦210,000" />
          <LimitRow label="VAT (7.5%)" value="₦15,750" />
          <LimitRow label="Total" value="₦225,750" total />
        </Card>
      </Section>

      <Section title="Steps">
        <Card style={{ width: 320 }}>
          <Steps
            items={[
              { title: "Review.", description: "An admin watches the full cut against the content rules." },
              { title: "Cleared or sent back.", description: "You get a note either way, usually within an hour." },
              { title: "On the board.", description: "It joins the rotation at your start time." },
            ]}
          />
        </Card>
      </Section>

      <Section title="Route accent — [data-route] override">
        <div data-route="viewer" style={{ display: "flex", gap: 10 }}>
          <Button variant="primary">Viewer</Button>
          <Pill dot tone="warn">
            Free
          </Pill>
        </div>
        <div data-route="brands" style={{ display: "flex", gap: 10 }}>
          <Button variant="primary">Brands</Button>
          <Pill dot tone="brandish">
            Brand
          </Pill>
        </div>
        <div data-route="admin" style={{ display: "flex", gap: 10 }}>
          <Button variant="primary">Admin</Button>
          <Pill dot tone="info">
            Admin
          </Pill>
        </div>
      </Section>
    </div>
  );
}
