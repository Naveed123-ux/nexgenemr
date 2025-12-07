"use client";

import {
    AlertCircle,
    BarChart3,
    Calendar,
    CreditCard,
    DollarSign,
    FileBarChart,
    FileText,
    Filter,
    Landmark,
    Mail,
    Phone,
    Printer,
    Receipt,
    Search,
    Send,
    Users,
    Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// --- MOCK DATA ---
const patientStatementsData = [
    { id: "STMT-001", patient: "Sarah Johnson", patientId: "PAT-12345", account: "ACC-789123", balance: 125.00, lastPayment: 25.00, lastPaymentDate: "2025-09-15", dueDate: "2025-10-26", status: "Current" },
    { id: "STMT-002", patient: "Michael Brown", patientId: "PAT-12346", account: "ACC-789124", balance: 350.00, plan: true, lastPayment: 50.00, lastPaymentDate: "2025-08-10", dueDate: "2025-10-26", status: "Overdue" },
    { id: "STMT-003", patient: "Jennifer Davis", patientId: "PAT-12347", account: "ACC-789125", balance: 750.00, lastPayment: 100.00, lastPaymentDate: "2025-07-05", dueDate: "2025-10-26", status: "Collections" },
    { id: "STMT-004", patient: "Robert Wilson", patientId: "PAT-12348", account: "ACC-789126", balance: 0.00, lastPayment: 25.00, lastPaymentDate: "2025-09-20", dueDate: "2025-10-26", status: "Paid" },
];

const paymentPlansData = [
    { id: 'PLAN-001', patient: 'Michael Brown', patientId: 'PAT-12346', total: 600, monthly: 100, remaining: 350, paymentsLeft: 4, nextDue: '2025-10-01', status: 'Active', autoPay: true },
    { id: 'PLAN-002', patient: 'Lisa Garcia', patientId: 'PAT-12349', total: 1200, monthly: 150, remaining: 900, paymentsLeft: 6, nextDue: '2025-10-05', status: 'Active', autoPay: false },
];

// --- MAIN COMPONENT ---
export default function PracticeManagementWorkflow() {
    return (
        <div className="min-h-screen bg-gray-50 mt-16">
            {/* Header Navigation */}
            <header>
                <div className="mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <button className="text-sm font-medium text-foreground border-b-2 border-foreground pb-4">
                                Practice Management
                            </button>
                            <button className="text-sm font-medium text-muted-foreground pb-4">
                                Dashboard
                            </button>
                        </div>
                        <Button variant="outline" size="sm">
                            Manage Dashboard
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto px-6 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-semibold text-foreground">
                            Practice Management Workflow
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            Last edited: 20 Dec 2023
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        EMR/EHR Revenue Cycle Management - From Encounter to Payment
                        Collection
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Outstanding Balance</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-semibold text-foreground">$1225.00</p>
                            <p className="text-xs text-muted-foreground">Patient responsibility</p>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Overdue Accounts</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-semibold text-foreground">1</p>
                            <p className="text-xs text-muted-foreground">Need follow-up</p>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Collections</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-semibold text-foreground">1</p>
                            <p className="text-xs text-muted-foreground">Sent to collections</p>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Payment Plans</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-semibold text-foreground">2</p>
                            <p className="text-xs text-muted-foreground">Active plans</p>
                        </div>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="statements" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 rounded-full bg-gray-200 p-1 mb-6">
                        <TabsTrigger value="statements" className="rounded-full data-[state=active]:bg-[#388fe5] data-[state=active]:text-black">Patient Statements</TabsTrigger>
                        <TabsTrigger value="processing" className="rounded-full data-[state=active]:bg-[#388fe5] data-[state=active]:text-black">Payment Processing</TabsTrigger>
                        <TabsTrigger value="plans" className="rounded-full data-[state=active]:bg-[#388fe5] data-[state=active]:text-black">Payment Plans</TabsTrigger>
                        <TabsTrigger value="collections" className="rounded-full data-[state=active]:bg-[#388fe5] data-[state=active]:text-black">Collections</TabsTrigger>
                    </TabsList>

                    {/* Patient Statements Tab */}
                    <TabsContent value="statements">
                        <Card className="p-6">
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-lg">Patient Statements</CardTitle>
                                <p className="text-sm text-muted-foreground">Manage patient billing statements and outstanding balances</p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input placeholder="Search statements..." className="pl-10" />
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Filter className="w-4 h-4" /> All Status
                                    </Button>
                                    <Button className="bg-[#388fe5] hover:bg-[#6ec044] text-black gap-2">
                                        <Send className="w-4 h-4" /> Generate Statements
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Statement ID</TableHead>
                                                <TableHead>Patient</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead>Balance</TableHead>
                                                <TableHead>Last Payment</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {patientStatementsData.map((stmt) => (
                                                <TableRow key={stmt.id}>
                                                    <TableCell className="font-medium">{stmt.id}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{stmt.patient}</div>
                                                        <div className="text-xs text-muted-foreground">{stmt.patientId}</div>
                                                    </TableCell>
                                                    <TableCell>{stmt.account}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center">
                                                            <span>${stmt.balance.toFixed(2)}</span>
                                                            {stmt.plan && <Badge variant="outline" className="ml-2 text-xs">Plan</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>${stmt.lastPayment.toFixed(2)}</div>
                                                        <div className="text-xs text-muted-foreground">{stmt.lastPaymentDate}</div>
                                                    </TableCell>
                                                    <TableCell>{stmt.dueDate}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            stmt.status === 'Paid' ? 'default' :
                                                                stmt.status === 'Overdue' ? 'destructive' :
                                                                    stmt.status === 'Collections' ? 'destructive' : 'secondary'
                                                        } className={cn(
                                                            stmt.status === 'Paid' && 'bg-green-100 text-green-800',
                                                            stmt.status === 'Overdue' && 'bg-red-100 text-red-800',
                                                            stmt.status === 'Collections' && 'bg-red-100 text-red-800',
                                                            stmt.status === 'Current' && 'bg-blue-100 text-blue-800',
                                                        )}>
                                                            {stmt.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="space-x-2">
                                                        <Button variant="outline" size="sm">View</Button>
                                                        {stmt.status !== 'Paid' && <Button variant="outline" size="sm">Send</Button>}
                                                        {stmt.status !== 'Paid' && <Button variant="outline" size="sm">Call</Button>}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Payment Processing Tab */}
                    <TabsContent value="processing">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-2">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Recent Transactions</CardTitle>
                                        <p className="text-sm text-muted-foreground">Patient payments and transaction history</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Transaction Items */}
                                        <div className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">Sarah Johnson</p>
                                                    <p className="text-sm text-muted-foreground">TXN-001 | 2025-09-26</p>
                                                </div>
                                                <p className="font-semibold text-lg">$25.00</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Wallet className="w-4 h-4" /> Patient Portal
                                                </div>
                                                <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">Michael Brown</p>
                                                    <p className="text-sm text-muted-foreground">TXN-002 | 2025-09-25</p>
                                                </div>
                                                <p className="font-semibold text-lg">$50.00</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CreditCard className="w-4 h-4" /> Credit Card
                                                </div>
                                                <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">Jennifer Davis</p>
                                                    <p className="text-sm text-muted-foreground">TXN-003 | 2025-09-24</p>
                                                </div>
                                                <p className="font-semibold text-lg">$100.00</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Landmark className="w-4 h-4" /> Check
                                                </div>
                                                <Badge variant="secondary">Pending</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-3">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payment Processing</CardTitle>
                                        <p className="text-sm text-muted-foreground">Process patient payments and refunds</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">Patient Search</label>
                                            <Input placeholder="Enter patient name or ID" className="mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Payment Amount</label>
                                            <div className="relative mt-1">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input type="number" placeholder="0.00" className="pl-9" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Payment Method</label>
                                            <Select>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select payment method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="credit-card">Credit Card</SelectItem>
                                                    <SelectItem value="check">Check</SelectItem>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="portal">Patient Portal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-4 pt-2">
                                            <Button className="flex-1 bg-black text-white hover:bg-gray-800">Process Payment</Button>
                                            <Button variant="outline" className="flex-1">Process Refund</Button>
                                        </div>
                                    </CardContent>
                                    <CardHeader>
                                        <CardTitle className="text-base">Quick Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" className="justify-start gap-2"><Phone className="w-4 h-4" /> Call Patient</Button>
                                        <Button variant="outline" className="justify-start gap-2"><Mail className="w-4 h-4" /> Send Email</Button>
                                        <Button variant="outline" className="justify-start gap-2"><Calendar className="w-4 h-4" /> Payment Plan</Button>
                                        <Button variant="outline" className="justify-start gap-2"><Printer className="w-4 h-4" /> Print Receipt</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Payment Plans Tab */}
                    <TabsContent value="plans">
                        <Card className="p-6">
                            <CardHeader className="p-0 mb-6 flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Payment Plans</CardTitle>
                                    <p className="text-sm text-muted-foreground">Manage patient payment plans and installment agreements</p>
                                </div>
                                <Button className="bg-black text-white hover:bg-gray-800">Create Payment Plan</Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Plan ID</TableHead>
                                                <TableHead>Patient</TableHead>
                                                <TableHead>Total Amount</TableHead>
                                                <TableHead>Monthly Payment</TableHead>
                                                <TableHead>Remaining</TableHead>
                                                <TableHead>Next Due</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentPlansData.map((plan) => (
                                                <TableRow key={plan.id}>
                                                    <TableCell className="font-medium">{plan.id}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{plan.patient}</div>
                                                        <div className="text-xs text-muted-foreground">{plan.patientId}</div>
                                                    </TableCell>
                                                    <TableCell>${plan.total.toFixed(2)}</TableCell>
                                                    <TableCell>${plan.monthly.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <div>${plan.remaining.toFixed(2)}</div>
                                                        <div className="text-xs text-muted-foreground">{plan.paymentsLeft} payments left</div>
                                                    </TableCell>
                                                    <TableCell>{plan.nextDue}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Badge className="bg-green-100 text-green-800">{plan.status}</Badge>
                                                            {plan.autoPay && <Badge variant="secondary">Auto-Pay</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="space-x-2">
                                                        <Button variant="outline" size="sm">View</Button>
                                                        <Button variant="outline" size="sm">Modify</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Collections Tab */}
                    <TabsContent value="collections">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Collections Queue</CardTitle>
                                        <p className="text-sm text-muted-foreground">Accounts requiring collections action</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-semibold">Michael Brown</p>
                                                    <p className="text-sm text-muted-foreground">ACC-789124 | Last payment: 2025-08-10</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-lg text-red-600">$350.00</p>
                                                    <Badge variant="destructive" className="bg-red-100 text-red-800">Overdue</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" variant="outline" className="gap-2 bg-green-500 text-white hover:bg-green-600 hover:text-white"><Phone className="w-4 h-4" />Call</Button>
                                                <Button size="sm" variant="outline" className="gap-2"><Mail className="w-4 h-4" />Email</Button>
                                                <Button size="sm" variant="outline">Payment Plan</Button>
                                                <Button size="sm" className="bg-red-600 text-white hover:bg-red-700">Send to Agency</Button>
                                            </div>
                                        </div>
                                        <div className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-semibold">Jennifer Davis</p>
                                                    <p className="text-sm text-muted-foreground">ACC-789125 | Last payment: 2025-07-05</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-lg text-red-600">$750.00</p>
                                                    <Badge variant="destructive">Collections</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" variant="outline" className="gap-2 bg-green-500 text-white hover:bg-green-600 hover:text-white"><Phone className="w-4 h-4" />Call</Button>
                                                <Button size="sm" variant="outline" className="gap-2"><Mail className="w-4 h-4" />Email</Button>
                                                <Button size="sm" variant="outline">Payment Plan</Button>
                                                <Button size="sm" className="bg-red-600 text-white hover:bg-red-700">Send to Agency</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-2">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Collections Analytics</CardTitle>
                                        <p className="text-sm text-muted-foreground">Performance metrics and trends</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="p-4 bg-red-50">
                                                <p className="text-sm text-muted-foreground">Total in Collections</p>
                                                <p className="text-2xl font-bold">$750.00</p>
                                            </Card>
                                            <Card className="p-4 bg-red-50">
                                                <p className="text-sm text-muted-foreground">Average Days Overdue</p>
                                                <p className="text-2xl font-bold">45</p>
                                            </Card>
                                            <Card className="p-4 bg-green-50">
                                                <p className="text-sm text-muted-foreground">Collection Rate</p>
                                                <p className="text-2xl font-bold">78%</p>
                                            </Card>
                                            <Card className="p-4 bg-green-50">
                                                <p className="text-sm text-muted-foreground">Resolved This Month</p>
                                                <p className="text-2xl font-bold">12</p>
                                            </Card>
                                        </div>
                                        <div className="space-y-2 pt-4">
                                            <h4 className="font-semibold">Collections Actions</h4>
                                            <Button variant="outline" className="w-full justify-start">Generate Collection Letters</Button>
                                            <Button variant="outline" className="w-full justify-start">Export Collection Report</Button>
                                            <Button variant="outline" className="w-full justify-start">Update Collection Agency</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
