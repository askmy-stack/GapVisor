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

import { invoices, type Invoice } from "@/data/reports-billing";
import { downloadBlob, downloadCsv } from "@/lib/download";
import { toast } from "sonner";

function downloadInvoice(invoice: Invoice) {
  const text = [
    "GapVisor invoice summary",
    "",
    `Invoice: ${invoice.id}`,
    `Date: ${invoice.date}`,
    `Amount: ${invoice.amount}`,
    `Status: ${invoice.status}`,
    "",
    "Sample data from demo mode. Official PDF invoices are available once billing is connected.",
    "",
  ].join("\n");
  downloadBlob(`${invoice.id}.txt`, text, "text/plain;charset=utf-8");
  toast.success(`${invoice.id} downloaded`);
}

export function InvoicesHistory() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Invoices & Billing History</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            downloadCsv("invoices.csv", invoices.map((i) => ({ ...i })));
            toast.success("Invoice history exported as CSV");
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => downloadInvoice(invoice)}
                    aria-label={`Download invoice ${invoice.id}`}
                  >
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