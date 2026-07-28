"use client";

import type { Settlement } from "@/types/money";
import { filsToBhd } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BenefitPayDashboardProps {
  settlements: Settlement[];
}

export function BenefitPayDashboard({ settlements }: BenefitPayDashboardProps) {
  const pending = settlements.filter((s) => s.status === "pending");
  const received = settlements.filter((s) => s.status === "received");

  const totalPendingFils = pending.reduce((sum, s) => sum + s.expectedFils, 0);
  const totalReceivedFils = received.reduce((sum, s) => sum + s.expectedFils, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Still Owed (Pending)
            </h3>
            <p className="text-3xl font-bold">
              BHD {filsToBhd(totalPendingFils).toFixed(3)}
            </p>
            <p className="text-sm text-muted-foreground">
              {pending.length} settlement{pending.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Already Received
            </h3>
            <p className="text-3xl font-bold">
              BHD {filsToBhd(totalReceivedFils).toFixed(3)}
            </p>
            <p className="text-sm text-muted-foreground">
              {received.length} settlement{received.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      </div>

      {/* Settlement Tables */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({received.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No pending BenefitPay settlements.
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Expected (BHD)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">
                        {settlement.periodLabel || settlement.salesDate}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {filsToBhd(settlement.expectedFils).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-800">
                          Pending
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {received.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No received BenefitPay settlements yet.
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Expected (BHD)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {received.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">
                        {settlement.periodLabel || settlement.salesDate}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {filsToBhd(settlement.expectedFils).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800">
                          Received
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
