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
}

export interface Payment {
  id: string;
  customerId: string;
  date: number;
  amount: number;
  createdBy: string;
}

export interface Adjustment {
  id: string;
  customerId: string;
  date: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdBy: string;
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
  station: 'Loruk - Ndalu' | 'Loruk - Junction' | 'Gel - Bungoma' | 'Gel - Kapenguria';
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
  station: 'Loruk - Ndalu' | 'Loruk - Junction' | 'Gel - Bungoma' | 'Gel - Kapenguria';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
}
