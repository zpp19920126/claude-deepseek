-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "units" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "costSharingMethod" TEXT,
    "sharingCount" INTEGER,
    "sorter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "priceMode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "zipCode" TEXT,
    "contactPerson" TEXT,
    "taxId" TEXT,
    "bank" TEXT,
    "region" TEXT,
    "updatedBy" TEXT,
    "contractStartDate" DATETIME,
    "contractEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "priceMode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "zipCode" TEXT,
    "contactPerson" TEXT,
    "taxId" TEXT,
    "bank" TEXT,
    "region" TEXT,
    "updatedBy" TEXT,
    "contractStartDate" DATETIME,
    "contractEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "thumbnail" TEXT,
    "mainImage" TEXT,
    "specification" TEXT,
    "unitCode" TEXT,
    "isRawVeg" BOOLEAN NOT NULL DEFAULT false,
    "isCleanVeg" BOOLEAN NOT NULL DEFAULT false,
    "yieldRate" REAL,
    "defaultSupplierId" TEXT,
    "defaultSupplierShortName" TEXT,
    "origin" TEXT,
    "model" TEXT,
    "categoryCode" TEXT,
    "sorter" TEXT,
    "shelfLife" INTEGER,
    "operator" TEXT,
    "remark" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_unitCode_fkey" FOREIGN KEY ("unitCode") REFERENCES "units" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "categories" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryDate" DATETIME,
    "documentNo" TEXT NOT NULL,
    "productCode" TEXT,
    "productName" TEXT,
    "customerCode" TEXT,
    "customerName" TEXT,
    "customerShortName" TEXT,
    "productionDate" DATETIME,
    "orderUnit" TEXT,
    "orderQuantity" REAL,
    "deliveryUnit" TEXT,
    "remark" TEXT,
    "deliveryQuantity" REAL,
    "receivedQuantity" REAL,
    "unitPrice" REAL,
    "amount" REAL,
    "discount" REAL,
    "discountUnitPrice" REAL,
    "discountAmount" REAL,
    "totalStock" REAL,
    "costPrice" REAL,
    "categoryCode" TEXT,
    "supplierId" TEXT,
    "sorter" TEXT,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,
    "preparedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_orders_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "products" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_customerCode_fkey" FOREIGN KEY ("customerCode") REFERENCES "customers" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "categories" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_categoryCode_idx" ON "products"("categoryCode");

-- CreateIndex
CREATE INDEX "products_unitCode_idx" ON "products"("unitCode");

-- CreateIndex
CREATE INDEX "products_defaultSupplierId_idx" ON "products"("defaultSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_documentNo_key" ON "sales_orders"("documentNo");

-- CreateIndex
CREATE INDEX "sales_orders_productCode_idx" ON "sales_orders"("productCode");

-- CreateIndex
CREATE INDEX "sales_orders_customerCode_idx" ON "sales_orders"("customerCode");

-- CreateIndex
CREATE INDEX "sales_orders_categoryCode_idx" ON "sales_orders"("categoryCode");

-- CreateIndex
CREATE INDEX "sales_orders_supplierId_idx" ON "sales_orders"("supplierId");

-- CreateIndex
CREATE INDEX "sales_orders_documentNo_idx" ON "sales_orders"("documentNo");
