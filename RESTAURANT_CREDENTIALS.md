# Restaurant System Login Credentials

## Owner Account (Multi-Restaurant Management)
**Username**: `owner`  
**Password**: `owner123`  
**Access**: Owner Dashboard - Can manage all 5 restaurants

---

## Restaurant 1: Casa Downtown (MAIN)
**Location**: 123 Boulevard Mohammed V, Casablanca, Morocco  
**Code**: MAIN

### Staff:
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **Cashier**: `cashier` / `cashier123`

---

## Restaurant 2: Rabat Downtown (RBT)
**Location**: 456 Avenue Hassan II, Rabat, Morocco  
**Code**: RBT  
**Email**: rabat@posq.com

### Staff:
- **Admin**: `admin2` / `admin123`

---

## Restaurant 3: Marrakech Medina (MRK)
**Location**: 789 Jemaa el-Fnaa, Marrakech, Morocco  
**Code**: MRK  
**Email**: marrakech@posq.com  
**Website**: https://marrakech.posq.com

### Features:
- Traditional Moroccan cuisine
- 10 tables with QR codes
- Sample menu items (Chicken Tagine, Lamb Couscous, etc.)
- Stock inventory tracking

### Staff:
- **Admin**: `admin_mrk` / `admin123`
- **Manager**: `manager_mrk` / `manager123`

---

## Restaurant 4: Tangier Seaside (TNG)
**Location**: 321 Boulevard Pasteur, Tangier, Morocco  
**Code**: TNG  
**Email**: tangier@posq.com  
**Website**: https://tangier.posq.com

### Features:
- Mediterranean fusion restaurant with ocean views
- 10 tables with QR codes
- Sample menu items
- Stock inventory tracking

### Staff:
- **Admin**: `admin_tng` / `admin123`
- **Manager**: `manager_tng` / `manager123`

---

## Restaurant 5: Fes Heritage (FES)
**Location**: 555 Bab Boujloud, Fes, Morocco  
**Code**: FES  
**Email**: fes@posq.com  
**Website**: https://fes.posq.com

### Features:
- Authentic Fassi cuisine in a restored riad
- 10 tables with QR codes
- Sample menu items
- Stock inventory tracking

### Staff:
- **Admin**: `admin_fes` / `admin123`
- **Manager**: `manager_fes` / `manager123`

---

## Quick Access Summary

| Restaurant | Code | Admin Username | Admin Password |
|------------|------|----------------|----------------|
| Casa Downtown | MAIN | admin | admin123 |
| Rabat Downtown | RBT | admin2 | admin123 |
| Marrakech Medina | MRK | admin_mrk | admin123 |
| Tangier Seaside | TNG | admin_tng | admin123 |
| Fes Heritage | FES | admin_fes | admin123 |

## Owner Dashboard Features
Login as `owner` / `owner123` to access:
- View all 5 restaurants
- Aggregate statistics (revenue, orders, employees)
- Detailed analytics for each restaurant
- Activity logs across all locations
- Create/Edit/Deactivate restaurants

---

## Testing Multi-Tenant Security
Each restaurant's data is completely isolated. You can test this by:
1. Login as `admin_mrk` - You'll only see Marrakech data
2. Login as `admin_tng` - You'll only see Tangier data
3. Login as `owner` - You'll see all restaurants

---

## Customer QR Code Access
Each restaurant has 10 tables (T1-T10). Customers can scan QR codes to order:
- Format: `/menu?table=T1&branch=MRK`
- No authentication required for customers
- Orders are linked to specific tables and branches
