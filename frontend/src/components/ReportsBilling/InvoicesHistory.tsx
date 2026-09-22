import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

import { invoices } from "@/data/reports-billing";
export function InvoicesHistory() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Invoices & Billing History</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium text-sm">{invoice.id}</TableCell>
                <TableCell className="text-sm">{invoice.date}</TableCell>
                <TableCell className="text-sm">{invoice.amount}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-none">
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}