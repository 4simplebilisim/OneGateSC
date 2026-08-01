-- 4Proc platform tabloları (procurement şeması, DDL sahipliği OneGate'te) + 1:1 satınalma profilleri
-- Üretim: prisma migrate diff (canlı onegate_wms ↔ schema.prisma), denetlendi: 56 CREATE yalnız procurement
-- DropForeignKey
ALTER TABLE "wms"."TBLDOCUMENT" DROP CONSTRAINT "TBLDOCUMENT_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "wms"."TBLINTEGRATIONPACKAGE" DROP CONSTRAINT "TBLINTEGRATIONPACKAGE_companyId_fkey";

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Departments" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_Departments_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_SubDepartments" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DepartmentId" INTEGER NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_SubDepartments_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_UserJobGroups" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_UserJobGroups_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ProcurementTypes" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_ProcurementTypes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_CostCenters" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_CostCenters_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_GLAccounts" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "ParentCode" TEXT,
    "Level" INTEGER NOT NULL DEFAULT 1,
    "IsPostable" BOOLEAN NOT NULL DEFAULT false,
    "ProcurementType" TEXT,
    "AccountCategory" TEXT,
    "WhtApplicable" BOOLEAN NOT NULL DEFAULT false,
    "DefaultWhtRate" DOUBLE PRECISION,
    "TaxCode" TEXT,
    "CostCenterRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_GLAccounts_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_CommodityGLMappings" (
    "Id" SERIAL NOT NULL,
    "CommodityId" INTEGER NOT NULL,
    "GLAccountId" INTEGER NOT NULL,
    "SpendType" TEXT NOT NULL,
    "IsDefault" BOOLEAN NOT NULL DEFAULT true,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_CommodityGLMappings_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Categories" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "ParentId" INTEGER,
    "Level" INTEGER NOT NULL DEFAULT 0,
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "Icon" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_Categories_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_CommodityHierarchys" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Level" INTEGER NOT NULL DEFAULT 1,
    "ParentId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_CommodityHierarchys_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_SupplierCommodities" (
    "Id" SERIAL NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "CommodityId" INTEGER NOT NULL,
    "IsApproved" BOOLEAN NOT NULL DEFAULT true,
    "ValidUntil" TIMESTAMP(3),
    "Notes" TEXT,

    CONSTRAINT "TBL4S_SupplierCommodities_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_SupplierProcurementTypes" (
    "Id" SERIAL NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "ProcurementTypeId" INTEGER NOT NULL,

    CONSTRAINT "TBL4S_SupplierProcurementTypes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Contracts" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Description" TEXT,
    "SupplierId" INTEGER NOT NULL,
    "SupplierName" TEXT,
    "SupplierCode" TEXT,
    "CurrencyId" INTEGER NOT NULL,
    "PaymentTermId" INTEGER NOT NULL,
    "LeadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "IncotermCode" TEXT,
    "IncotermLocation" TEXT,
    "IsBasedOnEXW" BOOLEAN NOT NULL DEFAULT false,
    "AdvancePaymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "AdvancePaymentNote" TEXT,
    "StartDate" TIMESTAMP(3),
    "EndDate" TIMESTAMP(3),
    "Status" TEXT NOT NULL,
    "TotalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalKDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalStopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CompanyId" INTEGER,
    "OrganizationId" INTEGER,
    "FileUrl" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "ApprovedDate" TIMESTAMP(3),
    "RejectedDate" TIMESTAMP(3),
    "RejectedReason" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_Contracts_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ContractDetails" (
    "Id" SERIAL NOT NULL,
    "ContractId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MaterialId" INTEGER,
    "MaterialCode" TEXT,
    "MaterialDescription" TEXT,
    "Description" TEXT,
    "UnitId" INTEGER,
    "UnitCode" TEXT,
    "MOQ" INTEGER NOT NULL DEFAULT 0,
    "VolumeValidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "IncrementalQty" INTEGER NOT NULL DEFAULT 0,
    "Quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "StopajPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "NetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "StopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "IsGradualPrice" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsCanceled" BOOLEAN NOT NULL DEFAULT false,
    "FileUrl" TEXT,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_ContractDetails_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ContractGradualPrices" (
    "Id" SERIAL NOT NULL,
    "ContractDetailId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MinQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "MaxQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "IncrementalQuantity" INTEGER NOT NULL DEFAULT 0,
    "Price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_ContractGradualPrices_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RateCards" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Description" TEXT,
    "SupplierId" INTEGER NOT NULL,
    "CommodityFamilyId" INTEGER,
    "CommodityClassId" INTEGER,
    "CommodityTypeId" INTEGER,
    "CurrencyId" INTEGER NOT NULL,
    "PaymentTermId" INTEGER NOT NULL,
    "IncotermId" INTEGER,
    "IncotermLocation" TEXT,
    "IsBasedOnEXW" BOOLEAN NOT NULL DEFAULT false,
    "AdvancePaymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "AdvancePaymentNote" TEXT,
    "StartDate" TIMESTAMP(3),
    "EndDate" TIMESTAMP(3),
    "Status" TEXT NOT NULL,
    "TotalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalKDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalStopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CompanyId" INTEGER,
    "OrganizationId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsCanceled" BOOLEAN NOT NULL DEFAULT false,
    "ApprovedDate" TIMESTAMP(3),
    "RejectedDate" TIMESTAMP(3),
    "RejectedReason" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_RateCards_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RateCardDetails" (
    "Id" SERIAL NOT NULL,
    "RateCardId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MaterialId" INTEGER,
    "ProductCode" TEXT,
    "ProductDescription" TEXT,
    "UnitId" INTEGER,
    "MinOrderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "OrderIncrement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "VolumeValidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "StopajPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "NetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "StopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "IsGradualPrice" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsCanceled" BOOLEAN NOT NULL DEFAULT false,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_RateCardDetails_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RateCardDetailItems" (
    "Id" SERIAL NOT NULL,
    "RateCardDetailId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MinQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "MaxQuantity" DOUBLE PRECISION,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "StartDate" TIMESTAMP(3),
    "EndDate" TIMESTAMP(3),
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_RateCardDetailItems_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Catalogs" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "SupplierId" INTEGER,
    "CurrencyId" INTEGER,
    "CategoryId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_Catalogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_CatalogItems" (
    "Id" SERIAL NOT NULL,
    "CatalogId" INTEGER NOT NULL,
    "MaterialId" INTEGER,
    "ProductCode" TEXT NOT NULL,
    "ProductName" TEXT NOT NULL,
    "Description" TEXT,
    "UnitId" INTEGER,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "MinOrderQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "OrderIncrement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "LeadTimeDays" INTEGER,
    "ImageUrl" TEXT,
    "CategoryId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_CatalogItems_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Orders" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "OrderType" INTEGER NOT NULL,
    "ProcurementTypeId" INTEGER,
    "SupplierId" INTEGER,
    "CompanyId" INTEGER,
    "OrganizationId" INTEGER,
    "IncotermId" INTEGER,
    "IncotermLocation" TEXT,
    "IsBasedOnEXW" BOOLEAN NOT NULL DEFAULT false,
    "AdvancePaymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Summary" TEXT,
    "Priority" TEXT,
    "RequestType" TEXT DEFAULT 'CONTRACTED',
    "Justification" TEXT,
    "BuyerNote" TEXT,
    "NeedDate" TIMESTAMP(3),
    "ContractId" INTEGER,
    "DeliveryAddress" TEXT,
    "DeliveryAsPerIncoterm" TIMESTAMP(3),
    "ExpectedDeliveryDateAtSite" TIMESTAMP(3),
    "GRLocationId" INTEGER,
    "Status" TEXT NOT NULL,
    "TotalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalKDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalStopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "SourcePRId" INTEGER,
    "POId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsCanceled" BOOLEAN NOT NULL DEFAULT false,
    "ApprovedDate" TIMESTAMP(3),
    "RejectedDate" TIMESTAMP(3),
    "RejectedReason" TEXT,
    "CurrencyId" INTEGER,
    "PaymentTermId" INTEGER,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),
    "SentAt" TIMESTAMP(3),
    "SentToEmail" TEXT,
    "SupplierConfirmToken" TEXT,
    "SupplierConfirmedAt" TIMESTAMP(3),
    "SupplierConfirmedBy" TEXT,
    "SupplierRejectedAt" TIMESTAMP(3),
    "SupplierRejectionNote" TEXT,

    CONSTRAINT "TBL4S_Orders_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_OrderDetails" (
    "Id" SERIAL NOT NULL,
    "OrderId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MaterialId" INTEGER,
    "ContractId" INTEGER,
    "ContractDetailId" INTEGER,
    "RateCardId" INTEGER,
    "RateCardDetailId" INTEGER,
    "UnitId" INTEGER,
    "Quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "OriginalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "OpenQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "DeliveredQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "StopajPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "NetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "StopajAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "DeliveryAsPerIncoterm" TIMESTAMP(3),
    "ExpectedDeliveryDateAtSite" TIMESTAMP(3),
    "GRLocationId" INTEGER,
    "CostCenterId" INTEGER,
    "GLAccountId" INTEGER,
    "IsCatalog" BOOLEAN NOT NULL DEFAULT false,
    "IsRateCard" BOOLEAN NOT NULL DEFAULT false,
    "IsService" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Status" TEXT,
    "MaterialCode" TEXT,
    "MaterialName" TEXT,
    "Description" TEXT,
    "UnitCode" TEXT,
    "CostCenterCode" TEXT,
    "GLAccountCode" TEXT,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),
    "HasCostSplit" BOOLEAN NOT NULL DEFAULT false,
    "IsNonCatalog" BOOLEAN NOT NULL DEFAULT false,
    "SupplierId" INTEGER,

    CONSTRAINT "TBL4S_OrderDetails_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_OrderDetailCostSplits" (
    "Id" SERIAL NOT NULL,
    "OrderDetailId" INTEGER NOT NULL,
    "CostCenterCode" TEXT NOT NULL,
    "Percentage" DOUBLE PRECISION NOT NULL,
    "Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_OrderDetailCostSplits_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ApprovalStates" (
    "Id" SERIAL NOT NULL,
    "EntityType" TEXT NOT NULL,
    "EntityId" INTEGER NOT NULL,
    "OrderId" INTEGER,
    "ContractId" INTEGER,
    "RateCardId" INTEGER,
    "Level" INTEGER NOT NULL,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "ApproverId" INTEGER NOT NULL,
    "ApproverCode" TEXT,
    "ApproverName" TEXT,
    "ApproverLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ApprovalStateTypeId" INTEGER,
    "Status" TEXT NOT NULL,
    "IsObserver" BOOLEAN NOT NULL DEFAULT false,
    "IsDelegated" BOOLEAN NOT NULL DEFAULT false,
    "DelegatedFromId" INTEGER,
    "EscalationHours" INTEGER,
    "EscalatedAt" TIMESTAMP(3),
    "ApprovedDate" TIMESTAMP(3),
    "RejectedDate" TIMESTAMP(3),
    "RejectedReason" TEXT,
    "Comments" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_ApprovalStates_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ApprovalMatrices" (
    "Id" SERIAL NOT NULL,
    "Module" TEXT NOT NULL,
    "SpendType" TEXT,
    "CommodityL2Code" TEXT,
    "MinAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "MaxAmount" DOUBLE PRECISION,
    "RequiredLevels" TEXT,
    "Steps" TEXT,
    "AutoApproveBelow" DOUBLE PRECISION,
    "EscalationHours" INTEGER NOT NULL DEFAULT 48,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_ApprovalMatrices_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Delegations" (
    "Id" SERIAL NOT NULL,
    "DelegatorId" INTEGER NOT NULL,
    "DelegateId" INTEGER NOT NULL,
    "StartDate" TIMESTAMP(3) NOT NULL,
    "EndDate" TIMESTAMP(3) NOT NULL,
    "Reason" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_Delegations_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Receipts" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "OrderId" INTEGER NOT NULL,
    "ReceiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "WareHouseId" INTEGER,
    "LocationId" INTEGER,
    "Notes" TEXT,
    "ReceiptType" TEXT NOT NULL DEFAULT 'GOODS',
    "TotalReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAcceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalRejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_Receipts_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ReceiptDetails" (
    "Id" SERIAL NOT NULL,
    "ReceiptId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "OrderDetailId" INTEGER NOT NULL,
    "MaterialId" INTEGER,
    "ReceivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "AcceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RejectReason" TEXT,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_ReceiptDetails_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RejectionReasons" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "Module" TEXT,
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_RejectionReasons_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Budgets" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Year" INTEGER NOT NULL,
    "Month" INTEGER,
    "DepartmentId" INTEGER,
    "CostCenterCode" TEXT,
    "GLAccountCode" TEXT,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ReservedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CommittedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "SpentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CurrencyId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_Budgets_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Documents" (
    "Id" SERIAL NOT NULL,
    "EntityType" TEXT NOT NULL,
    "EntityId" INTEGER NOT NULL,
    "FileName" TEXT NOT NULL,
    "OriginalName" TEXT NOT NULL,
    "MimeType" TEXT NOT NULL,
    "FileSize" INTEGER NOT NULL,
    "FilePath" TEXT NOT NULL,
    "UploadedBy" INTEGER,
    "UploadedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TBL4S_Documents_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_Invoices" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "OrderId" INTEGER NOT NULL,
    "SupplierId" INTEGER,
    "InvoiceNo" TEXT,
    "InvoiceDate" TIMESTAMP(3),
    "DueDate" TIMESTAMP(3),
    "CurrencyId" INTEGER,
    "TotalNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalKDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Status" TEXT NOT NULL DEFAULT 'Draft',
    "PaymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "PaymentDate" TIMESTAMP(3),
    "MatchStatus" TEXT NOT NULL DEFAULT 'Unmatched',
    "Notes" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_Invoices_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_InvoiceDetails" (
    "Id" SERIAL NOT NULL,
    "InvoiceId" INTEGER NOT NULL,
    "OrderDetailId" INTEGER,
    "MaterialCode" TEXT,
    "MaterialName" TEXT,
    "Description" TEXT,
    "UnitCode" TEXT,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "NetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "KDVAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "POQuantity" DOUBLE PRECISION,
    "ReceivedQty" DOUBLE PRECISION,
    "MatchResult" TEXT,

    CONSTRAINT "TBL4S_InvoiceDetails_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_NotificationLogs" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "EntityType" TEXT,
    "EntityId" INTEGER,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "EmailSent" BOOLEAN NOT NULL DEFAULT false,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_NotificationLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_AuditLogs" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER,
    "UserName" TEXT,
    "Action" TEXT NOT NULL,
    "EntityType" TEXT NOT NULL,
    "EntityId" INTEGER NOT NULL,
    "EntityCode" TEXT,
    "Changes" TEXT,
    "IpAddress" TEXT,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_AuditLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_OutOfOffice" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER NOT NULL,
    "BackupUserId" INTEGER NOT NULL,
    "StartDate" TIMESTAMP(3) NOT NULL,
    "EndDate" TIMESTAMP(3) NOT NULL,
    "Reason" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_OutOfOffice_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RFQs" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Draft',
    "SourcePRId" INTEGER,
    "DeadlineDate" TIMESTAMP(3) NOT NULL,
    "Notes" TEXT,
    "CancelReason" TEXT,
    "WinnerSupplierId" INTEGER,
    "WinnerNote" TEXT,
    "AwardedAt" TIMESTAMP(3),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_RFQs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RFQLines" (
    "Id" SERIAL NOT NULL,
    "RFQId" INTEGER NOT NULL,
    "LineNo" INTEGER NOT NULL DEFAULT 0,
    "MaterialId" INTEGER,
    "Description" TEXT NOT NULL,
    "Quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "UOMCode" TEXT NOT NULL DEFAULT 'ADET',
    "TargetPrice" DOUBLE PRECISION,
    "Notes" TEXT,

    CONSTRAINT "TBL4S_RFQLines_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RFQInvitations" (
    "Id" SERIAL NOT NULL,
    "RFQId" INTEGER NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "Token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    "SentAt" TIMESTAMP(3),
    "ViewedAt" TIMESTAMP(3),
    "SubmittedAt" TIMESTAMP(3),
    "DeclinedAt" TIMESTAMP(3),
    "DeclineReason" TEXT,
    "ExpiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBL4S_RFQInvitations_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RFQQuotes" (
    "Id" SERIAL NOT NULL,
    "InvitationId" INTEGER NOT NULL,
    "ValidUntil" TIMESTAMP(3) NOT NULL,
    "DeliveryDays" INTEGER NOT NULL DEFAULT 0,
    "PaymentTerms" TEXT,
    "Notes" TEXT,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CurrencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "SubmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IsWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TBL4S_RFQQuotes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_RFQQuoteLines" (
    "Id" SERIAL NOT NULL,
    "QuoteId" INTEGER NOT NULL,
    "RFQLineId" INTEGER NOT NULL,
    "UnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "DeliveryDays" INTEGER,
    "Notes" TEXT,

    CONSTRAINT "TBL4S_RFQQuoteLines_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_SupplierCertificates" (
    "Id" SERIAL NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "CertNumber" TEXT,
    "IssuedAt" TIMESTAMP(3),
    "ExpiresAt" TIMESTAMP(3) NOT NULL,
    "AlertSentAt" TIMESTAMP(3),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_SupplierCertificates_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_CreditNotes" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "InvoiceId" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "Amount" DOUBLE PRECISION NOT NULL,
    "Reason" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'DRAFT',
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ApprovedAt" TIMESTAMP(3),
    "ApprovedById" INTEGER,

    CONSTRAINT "TBL4S_CreditNotes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ContractTemplates" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "Category" TEXT,
    "Clauses" TEXT,
    "DefaultTerms" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_ContractTemplates_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ContractChangeOrders" (
    "Id" SERIAL NOT NULL,
    "Code" TEXT NOT NULL,
    "ContractId" INTEGER NOT NULL,
    "ChangeType" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "OldValue" TEXT,
    "NewValue" TEXT,
    "EffectiveDate" TIMESTAMP(3),
    "Status" TEXT NOT NULL DEFAULT 'Draft',
    "ApprovedAt" TIMESTAMP(3),
    "ApprovedById" INTEGER,
    "RejectedReason" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_ContractChangeOrders_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_WebhookConfigs" (
    "Id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "Secret" TEXT,
    "Events" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "RetryCount" INTEGER NOT NULL DEFAULT 3,
    "TimeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_WebhookConfigs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_WebhookLogs" (
    "Id" SERIAL NOT NULL,
    "WebhookId" INTEGER NOT NULL,
    "Event" TEXT NOT NULL,
    "Payload" TEXT,
    "ResponseCode" INTEGER,
    "ResponseBody" TEXT,
    "Attempt" INTEGER NOT NULL DEFAULT 1,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    "Error" TEXT,
    "SentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CompletedAt" TIMESTAMP(3),

    CONSTRAINT "TBL4S_WebhookLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_SupplierPortalTokens" (
    "Id" SERIAL NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "Token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "Email" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "LastLoginAt" TIMESTAMP(3),
    "ExpiresAt" TIMESTAMP(3) NOT NULL,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_SupplierPortalTokens_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_EInvoices" (
    "Id" SERIAL NOT NULL,
    "OrderId" INTEGER,
    "InvoiceId" INTEGER,
    "Direction" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ETTN" TEXT,
    "InvoiceNumber" TEXT NOT NULL,
    "InvoiceDate" TIMESTAMP(3) NOT NULL,
    "SenderVKN" TEXT NOT NULL,
    "ReceiverVKN" TEXT NOT NULL,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RawXml" TEXT,
    "Integrator" TEXT,
    "IntegratorRef" TEXT,
    "ErrorMessage" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_EInvoices_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_EArchiveReceipts" (
    "Id" SERIAL NOT NULL,
    "InvoiceId" INTEGER NOT NULL,
    "ReceiptNumber" TEXT NOT NULL,
    "IssuedAt" TIMESTAMP(3) NOT NULL,
    "PdfUrl" TEXT,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBL4S_EArchiveReceipts_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_ConsentRecords" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER NOT NULL,
    "ConsentType" TEXT NOT NULL,
    "Version" TEXT NOT NULL DEFAULT '1.0',
    "AcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IpAddress" TEXT,
    "UserAgent" TEXT,

    CONSTRAINT "TBL4S_ConsentRecords_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_IntegrationConfigs" (
    "Id" SERIAL NOT NULL,
    "Provider" TEXT NOT NULL DEFAULT 'LOGO',
    "Name" TEXT NOT NULL,
    "BaseUrl" TEXT NOT NULL,
    "ClientId" TEXT,
    "ClientSecret" TEXT,
    "Username" TEXT,
    "Password" TEXT,
    "FirmNo" INTEGER NOT NULL DEFAULT 1,
    "PeriodNo" INTEGER NOT NULL DEFAULT 1,
    "AccessToken" TEXT,
    "RefreshToken" TEXT,
    "TokenExpiresAt" TIMESTAMP(3),
    "SyncMaterials" BOOLEAN NOT NULL DEFAULT true,
    "SyncSuppliers" BOOLEAN NOT NULL DEFAULT true,
    "SyncUnits" BOOLEAN NOT NULL DEFAULT false,
    "SyncCurrencies" BOOLEAN NOT NULL DEFAULT false,
    "SyncCostCenters" BOOLEAN NOT NULL DEFAULT false,
    "SyncGLAccounts" BOOLEAN NOT NULL DEFAULT false,
    "SyncPaymentTerms" BOOLEAN NOT NULL DEFAULT false,
    "SyncWarehouses" BOOLEAN NOT NULL DEFAULT false,
    "SyncPO" BOOLEAN NOT NULL DEFAULT false,
    "SyncInvoice" BOOLEAN NOT NULL DEFAULT false,
    "SyncInterval" INTEGER NOT NULL DEFAULT 60,
    "LastSyncAt" TIMESTAMP(3),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedDate" TIMESTAMP(3),

    CONSTRAINT "TBL4S_IntegrationConfigs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_IntegrationLogs" (
    "Id" SERIAL NOT NULL,
    "ConfigId" INTEGER NOT NULL,
    "SyncType" TEXT NOT NULL,
    "Direction" TEXT NOT NULL DEFAULT 'PULL',
    "Status" TEXT NOT NULL DEFAULT 'RUNNING',
    "TotalRecords" INTEGER NOT NULL DEFAULT 0,
    "CreatedRecords" INTEGER NOT NULL DEFAULT 0,
    "UpdatedRecords" INTEGER NOT NULL DEFAULT 0,
    "SkippedRecords" INTEGER NOT NULL DEFAULT 0,
    "FailedRecords" INTEGER NOT NULL DEFAULT 0,
    "ErrorMessage" TEXT,
    "ErrorDetails" TEXT,
    "StartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CompletedAt" TIMESTAMP(3),
    "DurationMs" INTEGER,

    CONSTRAINT "TBL4S_IntegrationLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBL4S_IntegrationMappings" (
    "Id" SERIAL NOT NULL,
    "ConfigId" INTEGER NOT NULL,
    "EntityType" TEXT NOT NULL,
    "LocalId" INTEGER NOT NULL,
    "ExternalId" TEXT NOT NULL,
    "ExternalCode" TEXT,
    "LastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "SyncHash" TEXT,

    CONSTRAINT "TBL4S_IntegrationMappings_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "procurement"."TBLUSERPROCPROFILE" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "subDepartmentId" INTEGER,
    "userJobGroupId" INTEGER,
    "position" VARCHAR(100),
    "jobLocation" VARCHAR(100),
    "gender" VARCHAR(20),
    "lineManagerId" INTEGER,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "defaultBackupId" INTEGER,
    "approvalLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isApprover" BOOLEAN NOT NULL DEFAULT false,
    "workLevel" INTEGER NOT NULL DEFAULT 1,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLUSERPROCPROFILE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."TBLPARTNERPROCPROFILE" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "currencyId" INTEGER,
    "paymentTermId" INTEGER,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "advancePaymentPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "advancePaymentNote" VARCHAR(255),
    "iban" VARCHAR(40),
    "bankName" VARCHAR(100),
    "accountHolder" VARCHAR(100),
    "accountNumber" VARCHAR(40),
    "swiftCode" VARCHAR(20),
    "bankAddress" VARCHAR(255),
    "correspondentBank" VARCHAR(100),
    "bankBranch" VARCHAR(100),
    "shebaNumber" VARCHAR(40),
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "vatId" VARCHAR(40),
    "economicCode" VARCHAR(40),
    "tradeRegNo" VARCHAR(40),
    "deliveryPoint" VARCHAR(100),
    "otherTerms" VARCHAR(255),
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" DECIMAL(5,2),
    "isForbidden" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" VARCHAR(255),
    "blacklistedAt" TIMESTAMP(3),
    "blacklistedById" INTEGER,
    "onboardingStatus" VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    "onboardingNote" VARCHAR(255),
    "approvedAt" TIMESTAMP(3),
    "approvedById" INTEGER,
    "sendInfoEmail" BOOLEAN NOT NULL DEFAULT false,
    "sendInfoPrint" BOOLEAN NOT NULL DEFAULT false,
    "commodityFamilyId" INTEGER,
    "commodityClassId" INTEGER,
    "commodityTypeId" INTEGER,
    "entCode" VARCHAR(40),
    "heading" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPARTNERPROCPROFILE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."TBLPRODUCTPROCPROFILE" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "procurementTypeId" INTEGER,
    "categoryId" INTEGER,
    "commodityFamilyId" INTEGER,
    "commodityClassId" INTEGER,
    "commodityId" INTEGER,
    "minOrderQuantity" INTEGER NOT NULL DEFAULT 0,
    "orderIncrement" INTEGER NOT NULL DEFAULT 0,
    "leadTime" INTEGER NOT NULL DEFAULT 0,
    "supplierPartNo" VARCHAR(60),
    "unspscCode" VARCHAR(20),
    "manufacturerName" VARCHAR(100),
    "manufacturerPartNo" VARCHAR(60),
    "technicalSpecs" VARCHAR(255),
    "imageUrl" VARCHAR(255),
    "msdsUrl" VARCHAR(255),
    "glAccountId" INTEGER,
    "isCatalog" BOOLEAN NOT NULL DEFAULT false,
    "entCode" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPRODUCTPROCPROFILE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Departments_Code_key" ON "procurement"."TBL4S_Departments"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_SubDepartments_Code_key" ON "procurement"."TBL4S_SubDepartments"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_UserJobGroups_Code_key" ON "procurement"."TBL4S_UserJobGroups"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_ProcurementTypes_Code_key" ON "procurement"."TBL4S_ProcurementTypes"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_CostCenters_Code_key" ON "procurement"."TBL4S_CostCenters"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_GLAccounts_Code_key" ON "procurement"."TBL4S_GLAccounts"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_CommodityGLMappings_CommodityId_SpendType_key" ON "procurement"."TBL4S_CommodityGLMappings"("CommodityId", "SpendType");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Categories_Code_key" ON "procurement"."TBL4S_Categories"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_CommodityHierarchys_Code_key" ON "procurement"."TBL4S_CommodityHierarchys"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_SupplierCommodities_SupplierId_CommodityId_key" ON "procurement"."TBL4S_SupplierCommodities"("SupplierId", "CommodityId");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Contracts_Code_key" ON "procurement"."TBL4S_Contracts"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_RateCards_Code_key" ON "procurement"."TBL4S_RateCards"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Catalogs_Code_key" ON "procurement"."TBL4S_Catalogs"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Orders_Code_key" ON "procurement"."TBL4S_Orders"("Code");

-- CreateIndex
CREATE INDEX "TBL4S_OrderDetailCostSplits_OrderDetailId_idx" ON "procurement"."TBL4S_OrderDetailCostSplits"("OrderDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Receipts_Code_key" ON "procurement"."TBL4S_Receipts"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_RejectionReasons_Code_key" ON "procurement"."TBL4S_RejectionReasons"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Budgets_Code_key" ON "procurement"."TBL4S_Budgets"("Code");

-- CreateIndex
CREATE INDEX "TBL4S_Budgets_Year_CostCenterCode_Month_idx" ON "procurement"."TBL4S_Budgets"("Year", "CostCenterCode", "Month");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_Invoices_Code_key" ON "procurement"."TBL4S_Invoices"("Code");

-- CreateIndex
CREATE INDEX "TBL4S_OutOfOffice_UserId_StartDate_EndDate_idx" ON "procurement"."TBL4S_OutOfOffice"("UserId", "StartDate", "EndDate");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_RFQs_Code_key" ON "procurement"."TBL4S_RFQs"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_RFQInvitations_Token_key" ON "procurement"."TBL4S_RFQInvitations"("Token");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_RFQQuotes_InvitationId_key" ON "procurement"."TBL4S_RFQQuotes"("InvitationId");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_CreditNotes_Code_key" ON "procurement"."TBL4S_CreditNotes"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_ContractTemplates_Code_key" ON "procurement"."TBL4S_ContractTemplates"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_ContractChangeOrders_Code_key" ON "procurement"."TBL4S_ContractChangeOrders"("Code");

-- CreateIndex
CREATE INDEX "TBL4S_WebhookLogs_WebhookId_SentAt_idx" ON "procurement"."TBL4S_WebhookLogs"("WebhookId", "SentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_SupplierPortalTokens_Token_key" ON "procurement"."TBL4S_SupplierPortalTokens"("Token");

-- CreateIndex
CREATE INDEX "TBL4S_EInvoices_Status_idx" ON "procurement"."TBL4S_EInvoices"("Status");

-- CreateIndex
CREATE INDEX "TBL4S_EInvoices_Direction_idx" ON "procurement"."TBL4S_EInvoices"("Direction");

-- CreateIndex
CREATE INDEX "TBL4S_ConsentRecords_UserId_idx" ON "procurement"."TBL4S_ConsentRecords"("UserId");

-- CreateIndex
CREATE INDEX "TBL4S_IntegrationLogs_ConfigId_idx" ON "procurement"."TBL4S_IntegrationLogs"("ConfigId");

-- CreateIndex
CREATE INDEX "TBL4S_IntegrationLogs_SyncType_idx" ON "procurement"."TBL4S_IntegrationLogs"("SyncType");

-- CreateIndex
CREATE INDEX "TBL4S_IntegrationLogs_Status_idx" ON "procurement"."TBL4S_IntegrationLogs"("Status");

-- CreateIndex
CREATE INDEX "TBL4S_IntegrationLogs_StartedAt_idx" ON "procurement"."TBL4S_IntegrationLogs"("StartedAt");

-- CreateIndex
CREATE INDEX "TBL4S_IntegrationMappings_EntityType_idx" ON "procurement"."TBL4S_IntegrationMappings"("EntityType");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_IntegrationMappings_ConfigId_EntityType_LocalId_key" ON "procurement"."TBL4S_IntegrationMappings"("ConfigId", "EntityType", "LocalId");

-- CreateIndex
CREATE UNIQUE INDEX "TBL4S_IntegrationMappings_ConfigId_EntityType_ExternalId_key" ON "procurement"."TBL4S_IntegrationMappings"("ConfigId", "EntityType", "ExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLUSERPROCPROFILE_userId_key" ON "procurement"."TBLUSERPROCPROFILE"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPARTNERPROCPROFILE_partnerId_key" ON "procurement"."TBLPARTNERPROCPROFILE"("partnerId");

-- CreateIndex
CREATE INDEX "TBLPARTNERPROCPROFILE_currencyId_idx" ON "procurement"."TBLPARTNERPROCPROFILE"("currencyId");

-- CreateIndex
CREATE INDEX "TBLPARTNERPROCPROFILE_paymentTermId_idx" ON "procurement"."TBLPARTNERPROCPROFILE"("paymentTermId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPRODUCTPROCPROFILE_productId_key" ON "procurement"."TBLPRODUCTPROCPROFILE"("productId");

-- AddForeignKey
ALTER TABLE "wms"."TBLDOCUMENT" ADD CONSTRAINT "TBLDOCUMENT_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "wms"."TBLWAREHOUSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wms"."TBLINTEGRATIONPACKAGE" ADD CONSTRAINT "TBLINTEGRATIONPACKAGE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "wms"."TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."TBLUSERPROCPROFILE" ADD CONSTRAINT "TBLUSERPROCPROFILE_userId_fkey" FOREIGN KEY ("userId") REFERENCES "wms"."TBLUSER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."TBLPARTNERPROCPROFILE" ADD CONSTRAINT "TBLPARTNERPROCPROFILE_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "wms"."TBLBUSINESSPARTNER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."TBLPARTNERPROCPROFILE" ADD CONSTRAINT "TBLPARTNERPROCPROFILE_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "wms"."TBLCURRENCY"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."TBLPARTNERPROCPROFILE" ADD CONSTRAINT "TBLPARTNERPROCPROFILE_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "wms"."TBLPAYMENTTERM"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."TBLPRODUCTPROCPROFILE" ADD CONSTRAINT "TBLPRODUCTPROCPROFILE_productId_fkey" FOREIGN KEY ("productId") REFERENCES "wms"."TBLPRODUCT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

