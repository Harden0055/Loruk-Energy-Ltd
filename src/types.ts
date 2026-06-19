export interface Customer {
  id: string;
  customerId: string;
  name: string;
  creditLimit: number;
  balance: number;
  totalPurchases: number;
  status: 'active' | 'credit_risk';
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  actionType: 'create' | 'update' | 'delete';
  openingBalance?: number;
  openingBalanceType?: 'arrears' | 'advance';
}

export interface Delivery {
  id: string;
  customerId: string;
  date: number;
  productType: 'Diesel' | 'Super';
  litres: number;
  totalAmount: number;
  createdBy: string;
  createdAt?: number;
  updatedBy: string;
  actionType: 'create' | 'update' | 'delete';
}

export interface Payment {
  id: string;
  customerId: string;
  date: number;
  amount: number;
  createdBy: string;
  createdAt?: number;
  updatedBy: string;
  actionType: 'create' | 'update' | 'delete';
}

export interface Adjustment {
  id: string;
  customerId: string;
  date: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdBy: string;
  createdAt?: number;
  updatedBy: string;
  actionType: 'create' | 'update' | 'delete';
}

export interface PumpReading {
  fuelType: 'Diesel' | 'Super';
  salesStart: number;
  salesStop: number;
  salesAmount: number;
  litresStart: number;
  litresStop: number;
  litresVolume: number;
}

export interface StationExpense {
  description: string;
  amount: number;
}

export interface StationReport {
  id: string;
  station: 'Loruk - Ndalu' | 'Loruk - Junction' | 'Gel - Bungoma' | 'Gel - Kapenguria' | 'Kengas';
  date: number;
  attendantName?: string;
  
  pumpReadings: PumpReading[];
  
  otherSalesDetails: string;
  otherSalesAmount: number;
  
  totalSales: number;

  mpesaAmount: number;
  expenses: StationExpense[];
  totalExpenses: number;

  cashAtHand: number;
  depositedAmount: number;
  
  fuelBalanceDiesel: number;
  fuelBalanceSuper: number;

  createdBy: string;
}

export interface FleetExpense {
  id: string;
  carRegistration: string;
  amount: number;
  date: number;
  createdBy: string;
  distance?: number;
  station: 'Loruk - Ndalu' | 'Loruk - Junction' | 'Gel - Bungoma' | 'Gel - Kapenguria' | 'Kengas';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
}

export type Station = 'Ndalu' | 'Junction';

export interface FuelRate {
  id?: string;
  date: number;
  station: Station;
  product: 'Super' | 'Diesel';
  rate: number;
  stationId?: string;
  createdAt?: number;
  updatedAt: number;
}

export interface DailyPumpReading {
  id?: string;
  date: number;
  station: Station;
  product: 'Super' | 'Diesel';
  litresStart: number;
  litresStop: number;
  ratePerLitre: number;
  manualRevenue: number;
  litresSold: number;
  calculatedRevenue: number;
  difference: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LPGSale {
  id?: string;
  date: number;
  station: Station;
  cylindersSold: number;
  sold6kg?: number;
  sold13kg?: number;
  totalSalesAmount: number;
  completeGasSold?: number;
  emptyCylindersSold6kg?: number;
  emptyCylindersSold13kg?: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LPGPurchase {
  id?: string;
  date: number;
  station: Station;
  cylindersBought: number;
  bought6kg?: number;
  bought13kg?: number;
  purchaseCost: number;
  emptyCylindersBought6kg?: number;
  emptyCylindersBought13kg?: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BurnerPurchase {
  id?: string;
  date: number;
  station: Station;
  quantity: number;
  purchaseCost: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BurnerSale {
  id?: string;
  date: number;
  station: Station;
  quantity: number;
  salesAmount: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface GrillPurchase {
  id?: string;
  date: number;
  station: Station;
  quantity: number;
  purchaseCost: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface GrillSale {
  id?: string;
  date: number;
  station: Station;
  quantity: number;
  salesAmount: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DailyExpense {
  id?: string;
  date: number;
  station: Station;
  category: string;
  description: string;
  amount: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ExpenseCategory {
  id?: string;
  name: string;
  stationId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CashPosition {
  id?: string;
  date: number;
  station: Station;
  mpesaBalance: number;
  cashAtHand: number;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DailyInvoice {
  id?: string;
  invoiceNumber: string;
  customerName: string;
  customerCategory?: 'Credit Account' | 'Cash Customer' | 'Contractor';
  station: Station;
  invoiceDate: number;
  invoiceAmount: number;
  paidAmount: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface StationCustomer {
  id?: string;
  name: string;
  station: Station;
  category: 'Credit Account' | 'Cash Customer' | 'Contractor';
  balance: number;
  totalPurchases: number;
  status: 'active' | 'credit_risk';
  openingBalance?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface StationInfo {
  id?: string;
  name: string;
  code: string;
  location: string;
  status: 'active' | 'inactive';
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LPGInventory {
  id?: string;
  station: Station;
  cylinderSize: string;
  stockLevel: number;
  lastUpdated: number;
  stationId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface BurnerInventory {
  id?: string;
  station: Station;
  quantity: number;
  lastUpdated: number;
  stationId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface InvoicePayment {
  id?: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerCategory?: 'Credit Account' | 'Cash Customer' | 'Contractor';
  station: Station;
  amountPaid: number;
  paymentDate: number;
  paymentMethod: string;
  stationId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DailyReportRecord {
  id?: string;
  date: number;
  location: string;
  bankable: number;
  data?: any;
  station?: Station;
  totalSales?: number;
  totalExpenses?: number;
  bankableCash?: number;
  variance?: number;
  stationId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface OpeningStock {
  id?: string;
  station: Station;
  super: number;
  diesel: number;
  lpg6kg: number;
  lpg13kg: number;
  emptyCylinders6kg: number;
  emptyCylinders13kg: number;
  burner: number;
  grill: number;
  updatedAt: number;
}


