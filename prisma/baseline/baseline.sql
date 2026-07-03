--
-- PostgreSQL database dump
--

\restrict GEerPe4tdJSeFeGprnn7yMOIcdOpAgnbH0hTD8zp9hblU3rVdWfWrro7I0CcenA

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;


--
-- Name: logistics; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA logistics;


--
-- Name: procurement; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA procurement;


--
-- Name: sales; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sales;


--
-- Name: wms; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA wms;


--
-- Name: InvoiceSource; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance."InvoiceSource" AS ENUM (
    'PURCHASE_ORDER',
    'SALES_ORDER'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance."InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PAID',
    'CANCELLED'
);


--
-- Name: InvoiceType; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance."InvoiceType" AS ENUM (
    'PURCHASE',
    'SALES'
);


--
-- Name: ShipmentStatus; Type: TYPE; Schema: logistics; Owner: -
--

CREATE TYPE logistics."ShipmentStatus" AS ENUM (
    'PLANNED',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: StopStatus; Type: TYPE; Schema: logistics; Owner: -
--

CREATE TYPE logistics."StopStatus" AS ENUM (
    'PENDING',
    'DELIVERED',
    'FAILED'
);


--
-- Name: VehicleType; Type: TYPE; Schema: logistics; Owner: -
--

CREATE TYPE logistics."VehicleType" AS ENUM (
    'TRUCK',
    'VAN',
    'CAR',
    'MOTORCYCLE'
);


--
-- Name: PurchaseOrderStatus; Type: TYPE; Schema: procurement; Owner: -
--

CREATE TYPE procurement."PurchaseOrderStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: SalesOrderStatus; Type: TYPE; Schema: sales; Owner: -
--

CREATE TYPE sales."SalesOrderStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: BulkActionType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."BulkActionType" AS ENUM (
    'CONTROLLED_BULK',
    'BULK',
    'RESERVATION',
    'SELECTED_DOCUMENT',
    'BATCH_CHANGE'
);


--
-- Name: CapacityMessageType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."CapacityMessageType" AS ENUM (
    'ERROR',
    'WARNING'
);


--
-- Name: ColumnAuthMode; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ColumnAuthMode" AS ENUM (
    'READONLY',
    'HIDDEN'
);


--
-- Name: ConditionControlType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ConditionControlType" AS ENUM (
    'MANUAL',
    'REQUIRE_BATCH',
    'REQUIRE_SERIAL',
    'REQUIRE_REASON',
    'CONTROL_FIELD_REQUIRED',
    'MIN_SHELF_LIFE'
);


--
-- Name: ControlMode; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ControlMode" AS ENUM (
    'UNCONTROLLED',
    'CONTROLLED',
    'REFERENCE_CONTROLLED'
);


--
-- Name: CountStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."CountStatus" AS ENUM (
    'DRAFT',
    'COUNTING',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: DocumentStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."DocumentStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: ExtraFieldDataType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ExtraFieldDataType" AS ENUM (
    'MULTI_SELECT_FIXED',
    'TEXT',
    'NUMERIC',
    'DATE',
    'LOOKUP'
);


--
-- Name: ExtraFieldEntity; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ExtraFieldEntity" AS ENUM (
    'MATERIAL',
    'PARTNER',
    'DOC_HEADER',
    'DOC_DETAIL',
    'DOC_SCOPE',
    'PALLET',
    'STOCK',
    'PALLET_NOTIFY_HEADER',
    'OPERATION_DOC_DETAIL'
);


--
-- Name: ExtraFieldKind; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ExtraFieldKind" AS ENUM (
    'DYNAMIC',
    'STATIC'
);


--
-- Name: HandheldScreenType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."HandheldScreenType" AS ENUM (
    'RECEIPT',
    'PICK',
    'COUNT',
    'STOCK'
);


--
-- Name: IntegrationDirection; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."IntegrationDirection" AS ENUM (
    'IN',
    'OUT'
);


--
-- Name: IntegrationStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."IntegrationStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'ERROR'
);


--
-- Name: LinkScope; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."LinkScope" AS ENUM (
    'ALL',
    'GROUP',
    'SPECIFIC'
);


--
-- Name: LocationLinkType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."LocationLinkType" AS ENUM (
    'LOCATION',
    'LOCATION_GROUP'
);


--
-- Name: LocationStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."LocationStatus" AS ENUM (
    'ACTIVE',
    'BLOCKED',
    'FULL',
    'MAINTENANCE'
);


--
-- Name: LocationType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."LocationType" AS ENUM (
    'SHELF',
    'FLOOR',
    'RECEIVING',
    'SHIPPING',
    'STAGING',
    'QUARANTINE'
);


--
-- Name: MaterialLinkType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."MaterialLinkType" AS ENUM (
    'PRODUCT',
    'PRODUCT_GROUP'
);


--
-- Name: MovementDirection; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."MovementDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND',
    'INTERNAL',
    'COUNT'
);


--
-- Name: OperationDocumentType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."OperationDocumentType" AS ENUM (
    'STOCK_MOVEMENT',
    'COUNT',
    'PRODUCTION',
    'ORDER',
    'OTHER'
);


--
-- Name: PalletKind; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."PalletKind" AS ENUM (
    'EURO',
    'INDUSTRIAL',
    'BOX',
    'CUSTOM'
);


--
-- Name: PalletMixing; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."PalletMixing" AS ENUM (
    'SINGLE_PRODUCT',
    'MIXED'
);


--
-- Name: PartnerType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."PartnerType" AS ENUM (
    'CUSTOMER',
    'SUPPLIER',
    'BOTH'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ProductStatus" AS ENUM (
    'ACTIVE',
    'PASSIVE',
    'BLOCKED'
);


--
-- Name: ProductType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."ProductType" AS ENUM (
    'STANDARD',
    'RAW_MATERIAL',
    'SEMI_FINISHED',
    'FINISHED',
    'SERVICE'
);


--
-- Name: QualityResult; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."QualityResult" AS ENUM (
    'PENDING',
    'PASSED',
    'FAILED'
);


--
-- Name: UnitType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."UnitType" AS ENUM (
    'COUNT',
    'WEIGHT',
    'VOLUME',
    'LENGTH',
    'AREA'
);


--
-- Name: UserScopeType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."UserScopeType" AS ENUM (
    'FACILITY',
    'WAREHOUSE',
    'OPERATION_TYPE',
    'SCREEN'
);


--
-- Name: WorkOrderStatus; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."WorkOrderStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: WorkOrderType; Type: TYPE; Schema: wms; Owner: -
--

CREATE TYPE wms."WorkOrderType" AS ENUM (
    'PICK',
    'PUTAWAY',
    'COUNT',
    'TRANSFER',
    'REPLENISH'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: TBLINVOICE; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance."TBLINVOICE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "invoiceNo" character varying(40) NOT NULL,
    type finance."InvoiceType" NOT NULL,
    "partnerId" integer NOT NULL,
    "sourceOrderType" finance."InvoiceSource",
    "sourceOrderId" integer,
    status finance."InvoiceStatus" DEFAULT 'DRAFT'::finance."InvoiceStatus" NOT NULL,
    "invoiceDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone,
    currency character varying(3) DEFAULT 'TRY'::character varying NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1 NOT NULL,
    "subTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "discountTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "paidAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(500),
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLINVOICELINE; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance."TBLINVOICELINE" (
    id integer NOT NULL,
    "invoiceId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLINVOICELINE_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

CREATE SEQUENCE finance."TBLINVOICELINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLINVOICELINE_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: -
--

ALTER SEQUENCE finance."TBLINVOICELINE_id_seq" OWNED BY finance."TBLINVOICELINE".id;


--
-- Name: TBLINVOICE_id_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

CREATE SEQUENCE finance."TBLINVOICE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLINVOICE_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: -
--

ALTER SEQUENCE finance."TBLINVOICE_id_seq" OWNED BY finance."TBLINVOICE".id;


--
-- Name: TBLSHIPMENT; Type: TABLE; Schema: logistics; Owner: -
--

CREATE TABLE logistics."TBLSHIPMENT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "shipmentNo" character varying(40) NOT NULL,
    "vehicleId" integer,
    "driverName" character varying(100),
    status logistics."ShipmentStatus" DEFAULT 'PLANNED'::logistics."ShipmentStatus" NOT NULL,
    "plannedDate" timestamp(3) without time zone,
    "dispatchedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    note character varying(500),
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSHIPMENTSTOP; Type: TABLE; Schema: logistics; Owner: -
--

CREATE TABLE logistics."TBLSHIPMENTSTOP" (
    id integer NOT NULL,
    "shipmentId" integer NOT NULL,
    sequence integer NOT NULL,
    "partnerId" integer NOT NULL,
    "salesOrderId" integer,
    address character varying(255),
    status logistics."StopStatus" DEFAULT 'PENDING'::logistics."StopStatus" NOT NULL,
    "arrivedAt" timestamp(3) without time zone,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLSHIPMENTSTOP_id_seq; Type: SEQUENCE; Schema: logistics; Owner: -
--

CREATE SEQUENCE logistics."TBLSHIPMENTSTOP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSHIPMENTSTOP_id_seq; Type: SEQUENCE OWNED BY; Schema: logistics; Owner: -
--

ALTER SEQUENCE logistics."TBLSHIPMENTSTOP_id_seq" OWNED BY logistics."TBLSHIPMENTSTOP".id;


--
-- Name: TBLSHIPMENT_id_seq; Type: SEQUENCE; Schema: logistics; Owner: -
--

CREATE SEQUENCE logistics."TBLSHIPMENT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSHIPMENT_id_seq; Type: SEQUENCE OWNED BY; Schema: logistics; Owner: -
--

ALTER SEQUENCE logistics."TBLSHIPMENT_id_seq" OWNED BY logistics."TBLSHIPMENT".id;


--
-- Name: TBLVEHICLE; Type: TABLE; Schema: logistics; Owner: -
--

CREATE TABLE logistics."TBLVEHICLE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "plateNo" character varying(20) NOT NULL,
    name character varying(100),
    type logistics."VehicleType" DEFAULT 'TRUCK'::logistics."VehicleType" NOT NULL,
    "capacityKg" numeric(18,3),
    "capacityM3" numeric(18,3),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLVEHICLE_id_seq; Type: SEQUENCE; Schema: logistics; Owner: -
--

CREATE SEQUENCE logistics."TBLVEHICLE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLVEHICLE_id_seq; Type: SEQUENCE OWNED BY; Schema: logistics; Owner: -
--

ALTER SEQUENCE logistics."TBLVEHICLE_id_seq" OWNED BY logistics."TBLVEHICLE".id;


--
-- Name: TBLPURCHASEORDER; Type: TABLE; Schema: procurement; Owner: -
--

CREATE TABLE procurement."TBLPURCHASEORDER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "orderNo" character varying(40) NOT NULL,
    "supplierId" integer NOT NULL,
    "warehouseId" integer NOT NULL,
    status procurement."PurchaseOrderStatus" DEFAULT 'DRAFT'::procurement."PurchaseOrderStatus" NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expectedDate" timestamp(3) without time zone,
    currency character varying(3) DEFAULT 'TRY'::character varying NOT NULL,
    "totalAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(500),
    "createdById" integer NOT NULL,
    "approvedById" integer,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "discountTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1 NOT NULL,
    "subTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: TBLPURCHASEORDERLINE; Type: TABLE; Schema: procurement; Owner: -
--

CREATE TABLE procurement."TBLPURCHASEORDERLINE" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "receivedQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "discountAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLPURCHASEORDERLINE_id_seq; Type: SEQUENCE; Schema: procurement; Owner: -
--

CREATE SEQUENCE procurement."TBLPURCHASEORDERLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPURCHASEORDERLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: -
--

ALTER SEQUENCE procurement."TBLPURCHASEORDERLINE_id_seq" OWNED BY procurement."TBLPURCHASEORDERLINE".id;


--
-- Name: TBLPURCHASEORDER_id_seq; Type: SEQUENCE; Schema: procurement; Owner: -
--

CREATE SEQUENCE procurement."TBLPURCHASEORDER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPURCHASEORDER_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: -
--

ALTER SEQUENCE procurement."TBLPURCHASEORDER_id_seq" OWNED BY procurement."TBLPURCHASEORDER".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: TBLSALESALLOCATION; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales."TBLSALESALLOCATION" (
    id integer NOT NULL,
    "orderLineId" integer NOT NULL,
    "stockId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLSALESALLOCATION_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

CREATE SEQUENCE sales."TBLSALESALLOCATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSALESALLOCATION_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: -
--

ALTER SEQUENCE sales."TBLSALESALLOCATION_id_seq" OWNED BY sales."TBLSALESALLOCATION".id;


--
-- Name: TBLSALESORDER; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales."TBLSALESORDER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "orderNo" character varying(40) NOT NULL,
    "customerId" integer NOT NULL,
    "warehouseId" integer NOT NULL,
    status sales."SalesOrderStatus" DEFAULT 'DRAFT'::sales."SalesOrderStatus" NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestedDate" timestamp(3) without time zone,
    currency character varying(3) DEFAULT 'TRY'::character varying NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1 NOT NULL,
    "subTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "discountTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(500),
    "createdById" integer NOT NULL,
    "approvedById" integer,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSALESORDERLINE; Type: TABLE; Schema: sales; Owner: -
--

CREATE TABLE sales."TBLSALESORDERLINE" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "shippedQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    "discountRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(18,4) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "allocatedQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLSALESORDERLINE_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

CREATE SEQUENCE sales."TBLSALESORDERLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSALESORDERLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: -
--

ALTER SEQUENCE sales."TBLSALESORDERLINE_id_seq" OWNED BY sales."TBLSALESORDERLINE".id;


--
-- Name: TBLSALESORDER_id_seq; Type: SEQUENCE; Schema: sales; Owner: -
--

CREATE SEQUENCE sales."TBLSALESORDER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSALESORDER_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: -
--

ALTER SEQUENCE sales."TBLSALESORDER_id_seq" OWNED BY sales."TBLSALESORDER".id;


--
-- Name: TBLAREA; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLAREA" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "warehouseId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLAREA_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLAREA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLAREA_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLAREA_id_seq" OWNED BY wms."TBLAREA".id;


--
-- Name: TBLAUTOREFERENCEDOCUMENT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLAUTOREFERENCEDOCUMENT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "sourcePartnerId" integer NOT NULL,
    "sourceOperationTypeId" integer NOT NULL,
    "sourceLocLinkType" integer,
    "sourceLocLinkId" integer,
    "targetPartnerId" integer NOT NULL,
    "targetOperationTypeId" integer NOT NULL,
    "targetLocLinkType" integer,
    "targetLocLinkId" integer,
    facility boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLAUTOREFERENCEDOCUMENT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLAUTOREFERENCEDOCUMENT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLAUTOREFERENCEDOCUMENT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLAUTOREFERENCEDOCUMENT_id_seq" OWNED BY wms."TBLAUTOREFERENCEDOCUMENT".id;


--
-- Name: TBLBARCODETYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLBARCODETYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    "parseScript" text,
    "isProductionBarcode" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLBARCODETYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLBARCODETYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLBARCODETYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLBARCODETYPE_id_seq" OWNED BY wms."TBLBARCODETYPE".id;


--
-- Name: TBLBUSINESSPARTNER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLBUSINESSPARTNER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(200) NOT NULL,
    type wms."PartnerType" DEFAULT 'CUSTOMER'::wms."PartnerType" NOT NULL,
    "taxNumber" character varying(20),
    phone character varying(20),
    email character varying(150),
    city character varying(60),
    address character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "parentId" integer,
    "partnerGroupId" integer,
    "regionId" integer,
    address2 character varying(255),
    "contactPerson" character varying(100),
    "contactPerson2" character varying(100),
    "coordinateX" numeric(18,8),
    "coordinateY" numeric(18,8),
    country character varying(60),
    district character varying(60),
    "doorNo" character varying(20),
    fax character varying(20),
    "licenseNo" character varying(40),
    "licenseOffice" character varying(100),
    "mapCode" integer,
    "maxDeliveryTime" character varying(10),
    "minDeliveryTime" character varying(10),
    "mobilePhone" character varying(20),
    "nationalId" character varying(20),
    neighborhood character varying(100),
    "otherAddress" character varying(255),
    palletized boolean DEFAULT false NOT NULL,
    phone2 character varying(20),
    "postalCode" character varying(20),
    "priorityOrder" integer,
    "shortName" character varying(50),
    "specialCode" character varying(40),
    street character varying(100),
    "streetName" character varying(100),
    "taxOffice" character varying(100),
    "vehicleRestriction" character varying(255),
    website character varying(150)
);


--
-- Name: TBLBUSINESSPARTNER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLBUSINESSPARTNER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLBUSINESSPARTNER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLBUSINESSPARTNER_id_seq" OWNED BY wms."TBLBUSINESSPARTNER".id;


--
-- Name: TBLCOMPANY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCOMPANY" (
    id integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(150) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCOMPANY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCOMPANY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCOMPANY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCOMPANY_id_seq" OWNED BY wms."TBLCOMPANY".id;


--
-- Name: TBLCONDITIONBREAKLOG; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCONDITIONBREAKLOG" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "documentId" integer NOT NULL,
    "conditionType" character varying(10) NOT NULL,
    "conditionParameterId" integer,
    "breakReasonCode" character varying(20),
    "userId" integer,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLCONDITIONBREAKLOG_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCONDITIONBREAKLOG_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCONDITIONBREAKLOG_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCONDITIONBREAKLOG_id_seq" OWNED BY wms."TBLCONDITIONBREAKLOG".id;


--
-- Name: TBLCONTROLCOUNT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCONTROLCOUNT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40),
    "referenceCode" character varying(40),
    "warehouseId" integer,
    "approvedAt" timestamp(3) without time zone,
    note character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCONTROLCOUNTLINE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCONTROLCOUNTLINE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "controlCountId" integer NOT NULL,
    "lineNo" integer DEFAULT 1 NOT NULL,
    "productId" integer NOT NULL,
    "mainQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "unitId" integer,
    "countedQty" numeric(28,8),
    "countedUnitId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCONTROLCOUNTLINE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCONTROLCOUNTLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCONTROLCOUNTLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCONTROLCOUNTLINE_id_seq" OWNED BY wms."TBLCONTROLCOUNTLINE".id;


--
-- Name: TBLCONTROLCOUNT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCONTROLCOUNT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCONTROLCOUNT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCONTROLCOUNT_id_seq" OWNED BY wms."TBLCONTROLCOUNT".id;


--
-- Name: TBLCOUNTAPPROVALUSERGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCOUNTAPPROVALUSERGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    "operationTypeId" integer NOT NULL,
    "userGroupId" integer NOT NULL,
    "sortOrder" integer,
    "mailTemplateId" integer,
    "mailGroupId" integer,
    "mailSp" character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCOUNTAPPROVALUSERGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCOUNTAPPROVALUSERGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCOUNTAPPROVALUSERGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCOUNTAPPROVALUSERGROUP_id_seq" OWNED BY wms."TBLCOUNTAPPROVALUSERGROUP".id;


--
-- Name: TBLCOUNTASSIGNMENT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCOUNTASSIGNMENT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "stockCountId" integer NOT NULL,
    "userId" integer NOT NULL,
    note character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCOUNTASSIGNMENT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCOUNTASSIGNMENT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCOUNTASSIGNMENT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCOUNTASSIGNMENT_id_seq" OWNED BY wms."TBLCOUNTASSIGNMENT".id;


--
-- Name: TBLCOUNTCRITERIA; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCOUNTCRITERIA" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "fieldCode" character varying(40) NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCOUNTCRITERIA_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCOUNTCRITERIA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCOUNTCRITERIA_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCOUNTCRITERIA_id_seq" OWNED BY wms."TBLCOUNTCRITERIA".id;


--
-- Name: TBLCOUNTPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLCOUNTPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "countType" integer,
    "entryOperationTypeId" integer,
    "exitOperationTypeId" integer,
    "transferOperationTypeId" integer,
    equalize boolean DEFAULT false NOT NULL,
    "weightDiff" boolean DEFAULT false NOT NULL,
    "documentDetailCount" integer,
    "palletQtyPartialEntry" boolean DEFAULT false NOT NULL,
    stacked boolean DEFAULT false NOT NULL,
    "partialPallet" boolean DEFAULT false NOT NULL,
    "partialPalletWarning" boolean DEFAULT false NOT NULL,
    "stockMoveOnActiveCount" boolean DEFAULT false NOT NULL,
    "hideInnerPallets" boolean DEFAULT false NOT NULL,
    "hideMixedPallet" boolean DEFAULT false NOT NULL,
    "innerPalletCountCheck" boolean DEFAULT false NOT NULL,
    "hideInnerPalletStock" boolean DEFAULT false NOT NULL,
    "countDays" integer,
    "dontRecountPallet" boolean DEFAULT false NOT NULL,
    "askLocationOnScan" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLCOUNTPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLCOUNTPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLCOUNTPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLCOUNTPARAMETER_id_seq" OWNED BY wms."TBLCOUNTPARAMETER".id;


--
-- Name: TBLDASHBOARDREPORT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDASHBOARDREPORT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    type integer,
    "reportSp" character varying(200),
    "defaultReport" boolean DEFAULT false NOT NULL,
    "reportName" character varying(200),
    "userLinkType" integer,
    "userLinkId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDASHBOARDREPORT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDASHBOARDREPORT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDASHBOARDREPORT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDASHBOARDREPORT_id_seq" OWNED BY wms."TBLDASHBOARDREPORT".id;


--
-- Name: TBLDOCUMENT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENT" (
    id integer NOT NULL,
    "documentNo" character varying(40) NOT NULL,
    status wms."DocumentStatus" DEFAULT 'DRAFT'::wms."DocumentStatus" NOT NULL,
    "warehouseId" integer,
    "createdById" integer NOT NULL,
    "documentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note character varying(500),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "operationTypeId" integer NOT NULL,
    "partnerId" integer,
    "reasonId" integer,
    "documentStatusId" integer
);


--
-- Name: TBLDOCUMENTAPPROVALTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTAPPROVALTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "approvalType" integer NOT NULL,
    "controlCollection" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDOCUMENTAPPROVALTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTAPPROVALTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTAPPROVALTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTAPPROVALTYPE_id_seq" OWNED BY wms."TBLDOCUMENTAPPROVALTYPE".id;


--
-- Name: TBLDOCUMENTASSIGNMENT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTASSIGNMENT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "documentId" integer NOT NULL,
    "userId" integer NOT NULL,
    note character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDOCUMENTASSIGNMENT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTASSIGNMENT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTASSIGNMENT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTASSIGNMENT_id_seq" OWNED BY wms."TBLDOCUMENTASSIGNMENT".id;


--
-- Name: TBLDOCUMENTLINE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTLINE" (
    id integer NOT NULL,
    "documentId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "productId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "batchNo" character varying(100),
    "palletId" integer,
    "serialNo" character varying(100),
    "sourceLocationId" integer,
    "sourceStatusId" integer,
    "targetLocationId" integer,
    "targetStatusId" integer,
    "unitId" integer NOT NULL,
    "referenceQty" numeric(28,8),
    "customerId" integer,
    "poLine" character varying(50),
    "poNo" character varying(50),
    "collectedQty" numeric(28,8),
    "preparedQty" numeric(28,8),
    "companyId" integer NOT NULL
);


--
-- Name: TBLDOCUMENTLINESCOPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTLINESCOPE" (
    id integer NOT NULL,
    "documentLineId" integer NOT NULL,
    "scopeNo" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "unitId" integer NOT NULL,
    "sourceLocationId" integer,
    "sourceStatusId" integer,
    "targetLocationId" integer,
    "targetStatusId" integer,
    "palletId" integer,
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "customerId" integer,
    "poNo" character varying(50),
    "poLine" character varying(50),
    "vehicleId" integer,
    "netWeight" numeric(28,8),
    "grossWeight" numeric(28,8),
    "reasonId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL,
    "productionDate" date,
    "expiryDate" date
);


--
-- Name: TBLDOCUMENTLINESCOPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTLINESCOPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTLINESCOPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTLINESCOPE_id_seq" OWNED BY wms."TBLDOCUMENTLINESCOPE".id;


--
-- Name: TBLDOCUMENTLINE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTLINE_id_seq" OWNED BY wms."TBLDOCUMENTLINE".id;


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTPLANNINGPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "plannedDocStatusId" integer,
    "planningOperationTypeId" integer,
    "partCount" integer,
    "businessPartnerId" integer,
    "splitByProductGroup" boolean DEFAULT false NOT NULL,
    "fieldEntry" boolean DEFAULT false NOT NULL,
    "templateOperationTypeId" integer,
    "updateMainQty" boolean DEFAULT false NOT NULL,
    "locationAssign" boolean DEFAULT false NOT NULL,
    "extraField11" integer,
    "extraField12" integer,
    "extraField21" integer,
    "extraField22" integer,
    "extraField31" integer,
    "extraField32" integer,
    "extraField41" integer,
    "extraField42" integer,
    "extraField51" integer,
    "extraField52" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTPLANNINGPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTPLANNINGPARAMETER_id_seq" OWNED BY wms."TBLDOCUMENTPLANNINGPARAMETER".id;


--
-- Name: TBLDOCUMENTSTATUS; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTSTATUS" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    color character varying(20),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDOCUMENTSTATUSACTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTSTATUSACTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "documentStatusId" integer NOT NULL,
    "actionType" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLDOCUMENTSTATUSACTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTSTATUSACTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTSTATUSACTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTSTATUSACTION_id_seq" OWNED BY wms."TBLDOCUMENTSTATUSACTION".id;


--
-- Name: TBLDOCUMENTSTATUSCRITERIA; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTSTATUSCRITERIA" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "businessPartnerId" integer,
    criteria text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    condition character varying(30),
    "targetStatusId" integer,
    priority integer DEFAULT 0 NOT NULL
);


--
-- Name: TBLDOCUMENTSTATUSCRITERIA_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTSTATUSCRITERIA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTSTATUSCRITERIA_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTSTATUSCRITERIA_id_seq" OWNED BY wms."TBLDOCUMENTSTATUSCRITERIA".id;


--
-- Name: TBLDOCUMENTSTATUSHISTORY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLDOCUMENTSTATUSHISTORY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "documentId" integer NOT NULL,
    "fromCode" character varying(20),
    "toCode" character varying(20) NOT NULL,
    source character varying(40) NOT NULL,
    "userId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLDOCUMENTSTATUSHISTORY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTSTATUSHISTORY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTSTATUSHISTORY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTSTATUSHISTORY_id_seq" OWNED BY wms."TBLDOCUMENTSTATUSHISTORY".id;


--
-- Name: TBLDOCUMENTSTATUS_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENTSTATUS_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENTSTATUS_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENTSTATUS_id_seq" OWNED BY wms."TBLDOCUMENTSTATUS".id;


--
-- Name: TBLDOCUMENT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLDOCUMENT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLDOCUMENT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLDOCUMENT_id_seq" OWNED BY wms."TBLDOCUMENT".id;


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLENTRYCONDITIONBREAKPASSWORD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    password character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLENTRYCONDITIONBREAKPASSWORD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLENTRYCONDITIONBREAKPASSWORD_id_seq" OWNED BY wms."TBLENTRYCONDITIONBREAKPASSWORD".id;


--
-- Name: TBLENTRYCONDITIONBREAKREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLENTRYCONDITIONBREAKREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLENTRYCONDITIONBREAKREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLENTRYCONDITIONBREAKREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLENTRYCONDITIONBREAKREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLENTRYCONDITIONBREAKREASON_id_seq" OWNED BY wms."TBLENTRYCONDITIONBREAKREASON".id;


--
-- Name: TBLENTRYCONDITIONPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLENTRYCONDITIONPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "entryConditionTypeId" integer NOT NULL,
    "cariLinkType" wms."LinkScope",
    "cariLinkId" integer,
    "materialLinkType" wms."LinkScope",
    "materialLinkId" integer,
    "controlType" wms."ConditionControlType" DEFAULT 'MANUAL'::wms."ConditionControlType" NOT NULL,
    "conditionBreakAllowed" boolean DEFAULT true NOT NULL,
    exclude boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLENTRYCONDITIONPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLENTRYCONDITIONPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLENTRYCONDITIONPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLENTRYCONDITIONPARAMETER_id_seq" OWNED BY wms."TBLENTRYCONDITIONPARAMETER".id;


--
-- Name: TBLENTRYCONDITIONTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLENTRYCONDITIONTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLENTRYCONDITIONTYPEOPERATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "entryConditionTypeId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLENTRYCONDITIONTYPEOPERATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLENTRYCONDITIONTYPEOPERATION_id_seq" OWNED BY wms."TBLENTRYCONDITIONTYPEOPERATION".id;


--
-- Name: TBLENTRYCONDITIONTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLENTRYCONDITIONTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLENTRYCONDITIONTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLENTRYCONDITIONTYPE_id_seq" OWNED BY wms."TBLENTRYCONDITIONTYPE".id;


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONBREAKPASSWORD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    password character varying(100),
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONBREAKPASSWORD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONBREAKPASSWORD_id_seq" OWNED BY wms."TBLEXITCONDITIONBREAKPASSWORD".id;


--
-- Name: TBLEXITCONDITIONBREAKREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONBREAKREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONBREAKREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONBREAKREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONBREAKREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONBREAKREASON_id_seq" OWNED BY wms."TBLEXITCONDITIONBREAKREASON".id;


--
-- Name: TBLEXITCONDITIONCONTROLFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONCONTROLFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    "tableName" character varying(100),
    "fieldName" character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONCONTROLFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONCONTROLFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONCONTROLFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONCONTROLFIELD_id_seq" OWNED BY wms."TBLEXITCONDITIONCONTROLFIELD".id;


--
-- Name: TBLEXITCONDITIONPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "exitConditionTypeId" integer NOT NULL,
    "cariLinkType" wms."LinkScope",
    "cariLinkId" integer,
    "materialLinkType" wms."LinkScope",
    "materialLinkId" integer,
    "controlType" wms."ConditionControlType" DEFAULT 'MANUAL'::wms."ConditionControlType" NOT NULL,
    "controlFieldId" integer,
    "toleranceValue" numeric(18,4),
    "percentValue" numeric(9,4),
    "dayCount" integer,
    "conditionBreakAllowed" boolean DEFAULT true NOT NULL,
    exclude boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONPARAMETER_id_seq" OWNED BY wms."TBLEXITCONDITIONPARAMETER".id;


--
-- Name: TBLEXITCONDITIONTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONTYPEOPERATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXITCONDITIONTYPEOPERATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "exitConditionTypeId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "locationLinkType" integer,
    "locationId" integer,
    "fifoCheckOnReverseScan" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXITCONDITIONTYPEOPERATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONTYPEOPERATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONTYPEOPERATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONTYPEOPERATION_id_seq" OWNED BY wms."TBLEXITCONDITIONTYPEOPERATION".id;


--
-- Name: TBLEXITCONDITIONTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXITCONDITIONTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXITCONDITIONTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXITCONDITIONTYPE_id_seq" OWNED BY wms."TBLEXITCONDITIONTYPE".id;


--
-- Name: TBLEXTRAFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXTRAFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "fieldKind" wms."ExtraFieldKind" DEFAULT 'DYNAMIC'::wms."ExtraFieldKind" NOT NULL,
    "entityType" wms."ExtraFieldEntity" NOT NULL,
    "trackingCode" character varying(40),
    description character varying(200) NOT NULL,
    "fieldDataType" wms."ExtraFieldDataType" NOT NULL,
    "defaultValue" character varying(200),
    "maxAnswerCount" integer,
    "isRequired" boolean DEFAULT false NOT NULL,
    "minLength" integer,
    "maxLength" integer,
    "useAsIncrementing" boolean DEFAULT false NOT NULL,
    "transferOnDocSplit" boolean DEFAULT false NOT NULL,
    reference character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLEXTRAFIELDOPTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLEXTRAFIELDOPTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "extraFieldId" integer NOT NULL,
    code character varying(40) NOT NULL,
    description character varying(200),
    "sortOrder" integer,
    reference character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLEXTRAFIELDOPTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXTRAFIELDOPTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXTRAFIELDOPTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXTRAFIELDOPTION_id_seq" OWNED BY wms."TBLEXTRAFIELDOPTION".id;


--
-- Name: TBLEXTRAFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLEXTRAFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLEXTRAFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLEXTRAFIELD_id_seq" OWNED BY wms."TBLEXTRAFIELD".id;


--
-- Name: TBLFACILITY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLFACILITY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLFACILITY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLFACILITY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLFACILITY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLFACILITY_id_seq" OWNED BY wms."TBLFACILITY".id;


--
-- Name: TBLHANDHELDMENUGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLHANDHELDMENUGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "facilityId" integer,
    code character varying(40) NOT NULL,
    name character varying(100) NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLHANDHELDMENUGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLHANDHELDMENUGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLHANDHELDMENUGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLHANDHELDMENUGROUP_id_seq" OWNED BY wms."TBLHANDHELDMENUGROUP".id;


--
-- Name: TBLHANDHELDMENUITEM; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLHANDHELDMENUITEM" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "groupId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100) NOT NULL,
    "screenType" wms."HandheldScreenType" NOT NULL,
    "operationTypeId" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLHANDHELDMENUITEM_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLHANDHELDMENUITEM_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLHANDHELDMENUITEM_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLHANDHELDMENUITEM_id_seq" OWNED BY wms."TBLHANDHELDMENUITEM".id;


--
-- Name: TBLINTEGRATIONLOG; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLINTEGRATIONLOG" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    direction wms."IntegrationDirection" NOT NULL,
    "entityType" character varying(40) NOT NULL,
    status wms."IntegrationStatus" DEFAULT 'SUCCESS'::wms."IntegrationStatus" NOT NULL,
    "referenceKey" character varying(100),
    message character varying(500),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TBLINTEGRATIONLOG_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLINTEGRATIONLOG_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLINTEGRATIONLOG_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLINTEGRATIONLOG_id_seq" OWNED BY wms."TBLINTEGRATIONLOG".id;


--
-- Name: TBLINVENTORYRULE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLINVENTORYRULE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "productId" integer NOT NULL,
    "warehouseId" integer NOT NULL,
    "minQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "maxQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "reorderPoint" numeric(28,8) DEFAULT 0 NOT NULL,
    "reorderQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLINVENTORYRULE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLINVENTORYRULE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLINVENTORYRULE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLINVENTORYRULE_id_seq" OWNED BY wms."TBLINVENTORYRULE".id;


--
-- Name: TBLLABELTEMPLATE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLABELTEMPLATE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    "screenTitle" character varying(120),
    "labelName" character varying(120),
    "menuGroupId" integer,
    "displayType" integer,
    "reportType" integer,
    "col1Count" integer,
    "col2Count" integer,
    "col3Count" integer,
    "col1Length" integer,
    "col2Length" integer,
    password character varying(40),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLABELTEMPLATEITEM; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLABELTEMPLATEITEM" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "labelTemplateId" integer NOT NULL,
    title character varying(120),
    "itemType" character varying(20),
    "designName" character varying(80),
    "displayName" character varying(120),
    "sortOrder" integer,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    width integer,
    "maxLength" integer,
    "defaultValue" character varying(200),
    "comboQuery" text,
    "lookupId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLABELTEMPLATEITEM_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLABELTEMPLATEITEM_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLABELTEMPLATEITEM_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLABELTEMPLATEITEM_id_seq" OWNED BY wms."TBLLABELTEMPLATEITEM".id;


--
-- Name: TBLLABELTEMPLATEQUERY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLABELTEMPLATEQUERY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "labelTemplateId" integer NOT NULL,
    code character varying(40),
    "queryTitle" character varying(200),
    "queryDetail" text,
    "bindingField" character varying(80),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLABELTEMPLATEQUERY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLABELTEMPLATEQUERY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLABELTEMPLATEQUERY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLABELTEMPLATEQUERY_id_seq" OWNED BY wms."TBLLABELTEMPLATEQUERY".id;


--
-- Name: TBLLABELTEMPLATE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLABELTEMPLATE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLABELTEMPLATE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLABELTEMPLATE_id_seq" OWNED BY wms."TBLLABELTEMPLATE".id;


--
-- Name: TBLLABELTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLABELTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(50) NOT NULL,
    "labelName" character varying(200),
    "screenTitle" character varying(200),
    "displayType" integer,
    "reportType" integer,
    "col1Count" integer,
    "col2Count" integer,
    "col3Count" integer,
    "col1Length" integer,
    "col2Length" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "layoutJson" text
);


--
-- Name: TBLLABELTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLABELTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLABELTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLABELTYPE_id_seq" OWNED BY wms."TBLLABELTYPE".id;


--
-- Name: TBLLANGUAGE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLANGUAGE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(10) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLANGUAGE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLANGUAGE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLANGUAGE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLANGUAGE_id_seq" OWNED BY wms."TBLLANGUAGE".id;


--
-- Name: TBLLOCATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLOCATION" (
    id integer NOT NULL,
    "warehouseId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100),
    type wms."LocationType" DEFAULT 'SHELF'::wms."LocationType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "areaId" integer,
    barcode character varying(60),
    "companyId" integer NOT NULL,
    "isRamp" boolean DEFAULT false NOT NULL,
    "parentId" integer,
    priority integer,
    status wms."LocationStatus" DEFAULT 'ACTIVE'::wms."LocationStatus" NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLLOCATIONCAPACITY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLOCATIONCAPACITY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "locationLinkType" wms."LocationLinkType" NOT NULL,
    "locationLinkCode" integer NOT NULL,
    "materialLinkType" wms."MaterialLinkType",
    "materialLinkCode" integer,
    quantity numeric(28,8),
    "unitId" integer,
    "palletQty" numeric(28,8),
    "toleranceQty" numeric(28,8),
    "toleranceUnitId" integer,
    width numeric(18,4),
    length numeric(18,4),
    height numeric(18,4),
    "placementHeight" numeric(18,4),
    "dimensionUnitId" integer,
    weight numeric(18,4),
    "weightUnitId" integer,
    "messageType" wms."CapacityMessageType" DEFAULT 'ERROR'::wms."CapacityMessageType" NOT NULL,
    "distributeToCells" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLOCATIONCAPACITY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLOCATIONCAPACITY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLOCATIONCAPACITY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLOCATIONCAPACITY_id_seq" OWNED BY wms."TBLLOCATIONCAPACITY".id;


--
-- Name: TBLLOCATIONGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLOCATIONGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(16) NOT NULL,
    name character varying(100) NOT NULL,
    "isWorkOrderGroup" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLLOCATIONGROUPLINK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLLOCATIONGROUPLINK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "locationId" integer NOT NULL,
    "locationGroupId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLLOCATIONGROUPLINK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLOCATIONGROUPLINK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLOCATIONGROUPLINK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLOCATIONGROUPLINK_id_seq" OWNED BY wms."TBLLOCATIONGROUPLINK".id;


--
-- Name: TBLLOCATIONGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLOCATIONGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLOCATIONGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLOCATIONGROUP_id_seq" OWNED BY wms."TBLLOCATIONGROUP".id;


--
-- Name: TBLLOCATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLLOCATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLLOCATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLLOCATION_id_seq" OWNED BY wms."TBLLOCATION".id;


--
-- Name: TBLMENUGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLMENUGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    description character varying(200),
    "screenType" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLMENUGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLMENUGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLMENUGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLMENUGROUP_id_seq" OWNED BY wms."TBLMENUGROUP".id;


--
-- Name: TBLOPERATIONGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(16) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLOPERATIONGROUPLINK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONGROUPLINK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "operationGroupId" integer NOT NULL,
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLOPERATIONGROUPLINK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONGROUPLINK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONGROUPLINK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONGROUPLINK_id_seq" OWNED BY wms."TBLOPERATIONGROUPLINK".id;


--
-- Name: TBLOPERATIONGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONGROUP_id_seq" OWNED BY wms."TBLOPERATIONGROUP".id;


--
-- Name: TBLOPERATIONTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    direction wms."MovementDirection" NOT NULL,
    "affectsStock" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "operationGroupId" integer,
    "sequenceId" integer,
    "approvedDocUpdate" boolean DEFAULT false NOT NULL,
    "batchAssignment" boolean DEFAULT false NOT NULL,
    "bulkSend" boolean DEFAULT false NOT NULL,
    "cancelLocationId" integer,
    "detailLocationToCoverage" boolean DEFAULT false NOT NULL,
    "documentType" wms."OperationDocumentType" DEFAULT 'STOCK_MOVEMENT'::wms."OperationDocumentType" NOT NULL,
    "emailSend" boolean DEFAULT false NOT NULL,
    "equivalentApplication" boolean DEFAULT false NOT NULL,
    "groupSequenceId" integer,
    "grouping" boolean DEFAULT false NOT NULL,
    integration boolean DEFAULT false NOT NULL,
    "logControl" boolean DEFAULT false NOT NULL,
    "logControlDays" integer,
    logging boolean DEFAULT false NOT NULL,
    "materialBasedCollection" boolean DEFAULT false NOT NULL,
    "materialBasedQtyEdit" boolean DEFAULT false NOT NULL,
    "operationSequenceId" integer,
    "originalQtyUpdate" boolean DEFAULT false NOT NULL,
    "palletBreaking" boolean DEFAULT false NOT NULL,
    "passiveProductUse" boolean DEFAULT false NOT NULL,
    "qualityControl" boolean DEFAULT false NOT NULL,
    "readBasedControl" boolean DEFAULT false NOT NULL,
    "readBasedInfoMessage" boolean DEFAULT false NOT NULL,
    "reasonInHeader" boolean DEFAULT false NOT NULL,
    "reasonRequired" boolean DEFAULT false NOT NULL,
    "reserveTransfer" boolean DEFAULT false NOT NULL,
    "reverseOperationTypeId" integer,
    "sameUsePallet" boolean DEFAULT false NOT NULL,
    "sameUseSerial" boolean DEFAULT false NOT NULL,
    "controlMode" wms."ControlMode" DEFAULT 'UNCONTROLLED'::wms."ControlMode" NOT NULL,
    "facilityId" integer,
    "partialUsage" boolean DEFAULT false NOT NULL
);


--
-- Name: TBLOPERATIONTYPEBULKACTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPEBULKACTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    description character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "bulkActionType" wms."BulkActionType"
);


--
-- Name: TBLOPERATIONTYPEBULKACTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPEBULKACTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPEBULKACTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPEBULKACTION_id_seq" OWNED BY wms."TBLOPERATIONTYPEBULKACTION".id;


--
-- Name: TBLOPERATIONTYPECONVERSION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPECONVERSION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "statusId" integer,
    "conversionCode" character varying(10) NOT NULL,
    outgoing boolean DEFAULT false NOT NULL,
    "sourceLocLinkId" integer,
    "targetLocLinkId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "sourceLocLinkType" wms."LinkScope",
    "targetLocLinkType" wms."LinkScope"
);


--
-- Name: TBLOPERATIONTYPECONVERSION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPECONVERSION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPECONVERSION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPECONVERSION_id_seq" OWNED BY wms."TBLOPERATIONTYPECONVERSION".id;


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPEEXTRAFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "extraFieldId" integer NOT NULL,
    "isStatic" boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "useInTerminal" boolean DEFAULT false NOT NULL,
    "useInApproval" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPEEXTRAFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPEEXTRAFIELD_id_seq" OWNED BY wms."TBLOPERATIONTYPEEXTRAFIELD".id;


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPEFORBIDDENPRODUCT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "businessPartnerId" integer,
    "cariLinkId" integer,
    "materialLinkId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "cariLinkType" wms."LinkScope",
    "materialLinkType" wms."LinkScope"
);


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPEFORBIDDENPRODUCT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPEFORBIDDENPRODUCT_id_seq" OWNED BY wms."TBLOPERATIONTYPEFORBIDDENPRODUCT".id;


--
-- Name: TBLOPERATIONTYPELOCATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPELOCATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "sourceLocationId" integer,
    "targetLocationId" integer,
    "fixLocation" boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cariLinkId" integer,
    "cariLinkType" wms."LinkScope",
    "facilityId" integer,
    "materialLinkId" integer,
    "materialLinkType" wms."LinkScope",
    "sourceLinkType" wms."LinkScope",
    "targetLinkType" wms."LinkScope",
    "terminalFixSource" boolean DEFAULT false NOT NULL,
    "terminalFixTarget" boolean DEFAULT false NOT NULL
);


--
-- Name: TBLOPERATIONTYPELOCATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPELOCATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPELOCATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPELOCATION_id_seq" OWNED BY wms."TBLOPERATIONTYPELOCATION".id;


--
-- Name: TBLOPERATIONTYPEPALLETTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPEPALLETTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "palletTypeId" integer NOT NULL,
    "innerPalletTypeId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLOPERATIONTYPEPALLETTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPEPALLETTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPEPALLETTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPEPALLETTYPE_id_seq" OWNED BY wms."TBLOPERATIONTYPEPALLETTYPE".id;


--
-- Name: TBLOPERATIONTYPEREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPEREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "reasonId" integer NOT NULL,
    "sortOrder" integer,
    "isAutomatic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "reasonCategoryId" integer
);


--
-- Name: TBLOPERATIONTYPEREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPEREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPEREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPEREASON_id_seq" OWNED BY wms."TBLOPERATIONTYPEREASON".id;


--
-- Name: TBLOPERATIONTYPESTATUS; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPESTATUS" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "sourceStatusId" integer,
    "targetStatusId" integer,
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cariLinkId" integer,
    "cariLinkType" wms."LinkScope",
    "facilityId" integer,
    "materialLinkId" integer,
    "materialLinkType" wms."LinkScope"
);


--
-- Name: TBLOPERATIONTYPESTATUS_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPESTATUS_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPESTATUS_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPESTATUS_id_seq" OWNED BY wms."TBLOPERATIONTYPESTATUS".id;


--
-- Name: TBLOPERATIONTYPETOLERANCE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPETOLERANCE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "operationTypeId" integer,
    "businessPartnerId" integer,
    "cariLinkId" integer,
    "materialLinkId" integer,
    "ignoreSplit" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "cariLinkType" wms."LinkScope",
    "materialLinkType" wms."LinkScope"
);


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLOPERATIONTYPETOLERANCEDETAIL" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "toleranceId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "unitId" integer,
    "lowerPercent" numeric(28,8),
    "upperPercent" numeric(28,8)
);


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPETOLERANCEDETAIL_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPETOLERANCEDETAIL_id_seq" OWNED BY wms."TBLOPERATIONTYPETOLERANCEDETAIL".id;


--
-- Name: TBLOPERATIONTYPETOLERANCE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPETOLERANCE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPETOLERANCE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPETOLERANCE_id_seq" OWNED BY wms."TBLOPERATIONTYPETOLERANCE".id;


--
-- Name: TBLOPERATIONTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLOPERATIONTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLOPERATIONTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLOPERATIONTYPE_id_seq" OWNED BY wms."TBLOPERATIONTYPE".id;


--
-- Name: TBLPALLET; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPALLET" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "palletNo" character varying(40) NOT NULL,
    "palletTypeId" integer NOT NULL,
    "parentPalletId" integer,
    "baseUnitId" integer,
    "originalQty" numeric(28,8),
    "productionDate" date,
    "expiryDate" date,
    "beaconId" character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPALLETHISTORY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPALLETHISTORY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "palletId" integer NOT NULL,
    "parentPalletId" integer,
    "originalQty" numeric(28,8),
    "unitId" integer,
    "operationDocCode" character varying(40),
    "isActive" boolean DEFAULT true NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPALLETHISTORY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPALLETHISTORY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPALLETHISTORY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPALLETHISTORY_id_seq" OWNED BY wms."TBLPALLETHISTORY".id;


--
-- Name: TBLPALLETNOTIFICATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPALLETNOTIFICATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "palletNo" character varying(40),
    "oldPalletNo" character varying(40),
    "palletTypeId" integer,
    "locationId" integer,
    "statusId" integer,
    "partnerId" integer,
    "tripNo" character varying(40),
    "approvedAt" timestamp(3) without time zone,
    note character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPALLETNOTIFICATIONLINE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPALLETNOTIFICATIONLINE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "notificationId" integer NOT NULL,
    "lineNo" integer DEFAULT 1 NOT NULL,
    "productId" integer NOT NULL,
    "mainQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "unitId" integer,
    "netWeight" numeric(28,8),
    "grossWeight" numeric(28,8),
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "statusId" integer,
    "locationId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPALLETNOTIFICATIONLINE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPALLETNOTIFICATIONLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPALLETNOTIFICATIONLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPALLETNOTIFICATIONLINE_id_seq" OWNED BY wms."TBLPALLETNOTIFICATIONLINE".id;


--
-- Name: TBLPALLETNOTIFICATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPALLETNOTIFICATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPALLETNOTIFICATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPALLETNOTIFICATION_id_seq" OWNED BY wms."TBLPALLETNOTIFICATION".id;


--
-- Name: TBLPALLETTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPALLETTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    kind wms."PalletKind",
    "isDivisible" boolean DEFAULT true NOT NULL,
    "batchControl" boolean DEFAULT false NOT NULL,
    "singleProductControl" boolean DEFAULT false NOT NULL,
    "palletNoLength" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sequenceId" integer,
    "breakPalletOnTransfer" boolean DEFAULT false NOT NULL,
    "breakParentPallet" boolean DEFAULT false NOT NULL,
    "breakPartialPallet" boolean DEFAULT false NOT NULL,
    "facilityId" integer,
    "keepFullPalletOnTransfer" boolean DEFAULT false NOT NULL,
    "logControl" boolean DEFAULT false NOT NULL,
    "logControlWarningType" integer,
    logging boolean DEFAULT false NOT NULL,
    "mixingType" wms."PalletMixing",
    "newNoOnEdit" boolean DEFAULT false NOT NULL,
    "partialUse" boolean DEFAULT false NOT NULL,
    "removeFromPalletOnTransfer" boolean DEFAULT false NOT NULL
);


--
-- Name: TBLPALLETTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPALLETTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPALLETTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPALLETTYPE_id_seq" OWNED BY wms."TBLPALLETTYPE".id;


--
-- Name: TBLPALLET_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPALLET_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPALLET_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPALLET_id_seq" OWNED BY wms."TBLPALLET".id;


--
-- Name: TBLPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200),
    value character varying(510),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARAMETER_id_seq" OWNED BY wms."TBLPARAMETER".id;


--
-- Name: TBLPARTNERACCEPTANCETIME; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNERACCEPTANCETIME" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "partnerId" integer NOT NULL,
    day integer NOT NULL,
    "minTime" character varying(10),
    "maxTime" character varying(10),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLPARTNERACCEPTANCETIME_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNERACCEPTANCETIME_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNERACCEPTANCETIME_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNERACCEPTANCETIME_id_seq" OWNED BY wms."TBLPARTNERACCEPTANCETIME".id;


--
-- Name: TBLPARTNEREXTRAFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNEREXTRAFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "partnerId" integer NOT NULL,
    "fieldDefId" integer NOT NULL,
    value character varying(400),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLPARTNEREXTRAFIELDDEF; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNEREXTRAFIELDDEF" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    label character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPARTNEREXTRAFIELDDEF_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNEREXTRAFIELDDEF_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNEREXTRAFIELDDEF_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNEREXTRAFIELDDEF_id_seq" OWNED BY wms."TBLPARTNEREXTRAFIELDDEF".id;


--
-- Name: TBLPARTNEREXTRAFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNEREXTRAFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNEREXTRAFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNEREXTRAFIELD_id_seq" OWNED BY wms."TBLPARTNEREXTRAFIELD".id;


--
-- Name: TBLPARTNEREXTRAGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNEREXTRAGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(60) NOT NULL,
    "colorCode" character varying(100),
    reference character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPARTNEREXTRAGROUPLINK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNEREXTRAGROUPLINK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "partnerId" integer NOT NULL,
    "extraGroupId" integer NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLPARTNEREXTRAGROUPLINK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNEREXTRAGROUPLINK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNEREXTRAGROUPLINK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNEREXTRAGROUPLINK_id_seq" OWNED BY wms."TBLPARTNEREXTRAGROUPLINK".id;


--
-- Name: TBLPARTNEREXTRAGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNEREXTRAGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNEREXTRAGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNEREXTRAGROUP_id_seq" OWNED BY wms."TBLPARTNEREXTRAGROUP".id;


--
-- Name: TBLPARTNERFACILITY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNERFACILITY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "partnerId" integer NOT NULL,
    "facilityId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLPARTNERFACILITY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNERFACILITY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNERFACILITY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNERFACILITY_id_seq" OWNED BY wms."TBLPARTNERFACILITY".id;


--
-- Name: TBLPARTNERGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNERGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(60) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPARTNERGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNERGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNERGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNERGROUP_id_seq" OWNED BY wms."TBLPARTNERGROUP".id;


--
-- Name: TBLPARTNEROPTIMIZATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPARTNEROPTIMIZATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "partnerId" integer NOT NULL,
    "unloadPersonnelTime" integer,
    "unloadPersonnelCost" numeric(18,4),
    "vehicleSize" character varying(20),
    "serviceTime" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPARTNEROPTIMIZATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPARTNEROPTIMIZATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPARTNEROPTIMIZATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPARTNEROPTIMIZATION_id_seq" OWNED BY wms."TBLPARTNEROPTIMIZATION".id;


--
-- Name: TBLPICKORDERPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPICKORDERPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    "fullPalletOpId" integer,
    "fullCaseOpId" integer,
    "partialProductOpId" integer,
    "fullPalletUnitId" integer,
    "fullCaseUnitId" integer,
    "partialProductUnitId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPICKORDERPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPICKORDERPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPICKORDERPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPICKORDERPARAMETER_id_seq" OWNED BY wms."TBLPICKORDERPARAMETER".id;


--
-- Name: TBLPRINTER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRINTER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    name character varying(120) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer NOT NULL,
    address character varying(200) NOT NULL
);


--
-- Name: TBLPRINTER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRINTER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRINTER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRINTER_id_seq" OWNED BY wms."TBLPRINTER".id;


--
-- Name: TBLPRODUCT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCT" (
    id integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(240) NOT NULL,
    barcode character varying(50),
    "unitId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL,
    gtin character varying(20),
    "manufacturerCode" character varying(60),
    "productGroupCode" character varying(20),
    "shortName" character varying(50),
    status wms."ProductStatus" DEFAULT 'ACTIVE'::wms."ProductStatus" NOT NULL,
    type wms."ProductType" DEFAULT 'STANDARD'::wms."ProductType" NOT NULL,
    "vatRate" numeric(5,2),
    volume numeric(18,4),
    weight numeric(18,4),
    "productGroupId" integer,
    "productSubGroupId" integer,
    "detailTypeId" integer,
    "productTypeId" integer,
    "catchWeight" boolean DEFAULT false NOT NULL,
    "maxWeight" numeric(18,4),
    "minWeight" numeric(18,4),
    "shelfLifeControl" boolean DEFAULT false NOT NULL,
    "shelfLifeDays" integer
);


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTADDITIONALGROUPLINK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "productId" integer NOT NULL,
    "groupId" integer NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTADDITIONALGROUPLINK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTADDITIONALGROUPLINK_id_seq" OWNED BY wms."TBLPRODUCTADDITIONALGROUPLINK".id;


--
-- Name: TBLPRODUCTBASEDCOLLECTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTBASEDCOLLECTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer NOT NULL,
    "sourceOperationTypeId" integer NOT NULL,
    "targetOperationTypeId" integer NOT NULL,
    "exemptLocations" character varying(500),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTBASEDCOLLECTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTBASEDCOLLECTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTBASEDCOLLECTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTBASEDCOLLECTION_id_seq" OWNED BY wms."TBLPRODUCTBASEDCOLLECTION".id;


--
-- Name: TBLPRODUCTDETAILTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTDETAILTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTDETAILTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTDETAILTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTDETAILTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTDETAILTYPE_id_seq" OWNED BY wms."TBLPRODUCTDETAILTYPE".id;


--
-- Name: TBLPRODUCTFACILITY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTFACILITY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "productId" integer NOT NULL,
    "facilityId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLPRODUCTFACILITY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTFACILITY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTFACILITY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTFACILITY_id_seq" OWNED BY wms."TBLPRODUCTFACILITY".id;


--
-- Name: TBLPRODUCTGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "parentId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTGROUP_id_seq" OWNED BY wms."TBLPRODUCTGROUP".id;


--
-- Name: TBLPRODUCTSUBGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTSUBGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(120) NOT NULL,
    reference character varying(200),
    "imagePath" character varying(500),
    "sortOrder" integer,
    "colorCode" character varying(14),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTSUBGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTSUBGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTSUBGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTSUBGROUP_id_seq" OWNED BY wms."TBLPRODUCTSUBGROUP".id;


--
-- Name: TBLPRODUCTSUBSTITUTE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTSUBSTITUTE" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    "substituteProductId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLPRODUCTSUBSTITUTE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTSUBSTITUTE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTSUBSTITUTE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTSUBSTITUTE_id_seq" OWNED BY wms."TBLPRODUCTSUBSTITUTE".id;


--
-- Name: TBLPRODUCTTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLPRODUCTTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTTYPE_id_seq" OWNED BY wms."TBLPRODUCTTYPE".id;


--
-- Name: TBLPRODUCTUNIT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTUNIT" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    "isBaseUnit" boolean DEFAULT false NOT NULL,
    multiplier numeric(28,8) DEFAULT 1 NOT NULL,
    divisor numeric(28,8) DEFAULT 1 NOT NULL,
    barcode character varying(50),
    length numeric(18,4),
    width numeric(18,4),
    height numeric(18,4),
    area numeric(18,4),
    volume numeric(18,4),
    "netWeight" numeric(18,4),
    "grossWeight" numeric(18,4),
    "weightUnitId" integer,
    "batchTracking" boolean DEFAULT false NOT NULL,
    "serialTracking" boolean DEFAULT false NOT NULL,
    "minPalletQty" numeric(28,8),
    "maxPalletQty" numeric(28,8),
    "isSalesUnit" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLPRODUCTUNITBARCODE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLPRODUCTUNITBARCODE" (
    id integer NOT NULL,
    "productUnitId" integer NOT NULL,
    barcode character varying(100) NOT NULL,
    "labelAddress" character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLPRODUCTUNITBARCODE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTUNITBARCODE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTUNITBARCODE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTUNITBARCODE_id_seq" OWNED BY wms."TBLPRODUCTUNITBARCODE".id;


--
-- Name: TBLPRODUCTUNIT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCTUNIT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCTUNIT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCTUNIT_id_seq" OWNED BY wms."TBLPRODUCTUNIT".id;


--
-- Name: TBLPRODUCT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLPRODUCT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLPRODUCT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLPRODUCT_id_seq" OWNED BY wms."TBLPRODUCT".id;


--
-- Name: TBLQUALITYINSPECTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLQUALITYINSPECTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "inspectionNo" character varying(40) NOT NULL,
    "productId" integer NOT NULL,
    "locationId" integer NOT NULL,
    "statusId" integer NOT NULL,
    "unitId" integer NOT NULL,
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "palletId" integer,
    quantity numeric(28,8) NOT NULL,
    result wms."QualityResult" DEFAULT 'PENDING'::wms."QualityResult" NOT NULL,
    note character varying(500),
    "createdById" integer NOT NULL,
    "inspectedById" integer,
    "inspectedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLQUALITYINSPECTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLQUALITYINSPECTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLQUALITYINSPECTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLQUALITYINSPECTION_id_seq" OWNED BY wms."TBLQUALITYINSPECTION".id;


--
-- Name: TBLRACKFEEDPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLRACKFEEDPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    "locationGroupId" integer,
    "onStockEmpty" boolean DEFAULT false NOT NULL,
    "capacityPercent" numeric(28,8),
    "palletBreaking" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLRACKFEEDPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLRACKFEEDPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLRACKFEEDPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLRACKFEEDPARAMETER_id_seq" OWNED BY wms."TBLRACKFEEDPARAMETER".id;


--
-- Name: TBLREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLREASONCATEGORY; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREASONCATEGORY" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100),
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLREASONCATEGORY_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREASONCATEGORY_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREASONCATEGORY_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREASONCATEGORY_id_seq" OWNED BY wms."TBLREASONCATEGORY".id;


--
-- Name: TBLREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREASON_id_seq" OWNED BY wms."TBLREASON".id;


--
-- Name: TBLREGION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREGION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(60) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLREGION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREGION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREGION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREGION_id_seq" OWNED BY wms."TBLREGION".id;


--
-- Name: TBLREPORTCRITERIA; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREPORTCRITERIA" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "reportId" integer NOT NULL,
    "fieldCode" character varying(40) NOT NULL,
    label character varying(80) NOT NULL,
    type character varying(20) NOT NULL,
    "refResource" character varying(60),
    options character varying(500),
    required boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLREPORTCRITERIA_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREPORTCRITERIA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREPORTCRITERIA_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREPORTCRITERIA_id_seq" OWNED BY wms."TBLREPORTCRITERIA".id;


--
-- Name: TBLREPORTDEF; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREPORTDEF" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(120) NOT NULL,
    "sourceKey" character varying(40) NOT NULL,
    category character varying(60),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLREPORTDEF_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREPORTDEF_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREPORTDEF_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREPORTDEF_id_seq" OWNED BY wms."TBLREPORTDEF".id;


--
-- Name: TBLREPORTFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLREPORTFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "reportId" integer NOT NULL,
    "fieldCode" character varying(40) NOT NULL,
    label character varying(80) NOT NULL,
    align character varying(10),
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLREPORTFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLREPORTFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLREPORTFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLREPORTFIELD_id_seq" OWNED BY wms."TBLREPORTFIELD".id;


--
-- Name: TBLROLE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROLE" (
    id integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROLE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROLE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROLE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROLE_id_seq" OWNED BY wms."TBLROLE".id;


--
-- Name: TBLROUTINGBREAKPASSWORD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGBREAKPASSWORD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    password character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGBREAKPASSWORD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGBREAKPASSWORD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGBREAKPASSWORD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGBREAKPASSWORD_id_seq" OWNED BY wms."TBLROUTINGBREAKPASSWORD".id;


--
-- Name: TBLROUTINGBREAKREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGBREAKREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGBREAKREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGBREAKREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGBREAKREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGBREAKREASON_id_seq" OWNED BY wms."TBLROUTINGBREAKREASON".id;


--
-- Name: TBLROUTINGCONTROLFIELD; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGCONTROLFIELD" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    "fieldName" character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGCONTROLFIELD_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGCONTROLFIELD_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGCONTROLFIELD_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGCONTROLFIELD_id_seq" OWNED BY wms."TBLROUTINGCONTROLFIELD".id;


--
-- Name: TBLROUTINGPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "routingTypeId" integer NOT NULL,
    "cariLinkType" wms."LinkScope",
    "cariLinkId" integer,
    "materialLinkType" wms."LinkScope",
    "materialLinkId" integer,
    "sortOrder" integer,
    "controlFieldId" integer,
    "messageType" wms."CapacityMessageType" DEFAULT 'WARNING'::wms."CapacityMessageType" NOT NULL,
    "conditionBreak" boolean DEFAULT false NOT NULL,
    "controlMode" character varying(40),
    "spName" character varying(120),
    "controlTypeDescription" character varying(200),
    "incrementalSort" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGPARAMETER_id_seq" OWNED BY wms."TBLROUTINGPARAMETER".id;


--
-- Name: TBLROUTINGPRODUCTLOCATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGPRODUCTLOCATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "materialLinkType" integer,
    "additionalGroupOrder" integer,
    "materialLinkId" integer,
    "locationLinkType" integer,
    "locationLinkId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGPRODUCTLOCATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGPRODUCTLOCATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGPRODUCTLOCATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGPRODUCTLOCATION_id_seq" OWNED BY wms."TBLROUTINGPRODUCTLOCATION".id;


--
-- Name: TBLROUTINGRULE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGRULE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "routingTypeId" integer,
    "materialLinkType" wms."MaterialLinkType" NOT NULL,
    "materialLinkCode" integer NOT NULL,
    "locationLinkType" wms."LocationLinkType" NOT NULL,
    "locationLinkCode" integer NOT NULL,
    priority integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGRULE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGRULE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGRULE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGRULE_id_seq" OWNED BY wms."TBLROUTINGRULE".id;


--
-- Name: TBLROUTINGTYPE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGTYPE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLROUTINGTYPEOPERATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLROUTINGTYPEOPERATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "routingTypeId" integer NOT NULL,
    "operationTypeId" integer NOT NULL,
    "locationId" integer,
    "taskPlanId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "locationLinkType" wms."LinkScope"
);


--
-- Name: TBLROUTINGTYPEOPERATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGTYPEOPERATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGTYPEOPERATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGTYPEOPERATION_id_seq" OWNED BY wms."TBLROUTINGTYPEOPERATION".id;


--
-- Name: TBLROUTINGTYPE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLROUTINGTYPE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLROUTINGTYPE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLROUTINGTYPE_id_seq" OWNED BY wms."TBLROUTINGTYPE".id;


--
-- Name: TBLSCREENREPORTLINK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSCREENREPORTLINK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "screenButtonCode" character varying(50),
    "reportCode" character varying(50),
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSCREENREPORTLINK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSCREENREPORTLINK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSCREENREPORTLINK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSCREENREPORTLINK_id_seq" OWNED BY wms."TBLSCREENREPORTLINK".id;


--
-- Name: TBLSEQUENCE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSEQUENCE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "isAutomatic" boolean DEFAULT true NOT NULL,
    prefix character varying(20),
    prefix2 character varying(200),
    "padLength" integer DEFAULT 6 NOT NULL,
    "startNo" integer DEFAULT 1 NOT NULL,
    "endNo" integer,
    "currentValue" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSEQUENCE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSEQUENCE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSEQUENCE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSEQUENCE_id_seq" OWNED BY wms."TBLSEQUENCE".id;


--
-- Name: TBLSEQUENTIALOPERATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSEQUENTIALOPERATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "firstOperationId" integer NOT NULL,
    "secondOperationId" integer NOT NULL,
    "cariLinkId" integer,
    "materialLinkId" integer,
    "locationLinkId" integer,
    "useInWorkOrder" boolean DEFAULT false NOT NULL,
    "spName" character varying(300),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer,
    "cariLinkType" wms."LinkScope",
    "materialLinkType" wms."LinkScope",
    "locationLinkType" wms."LinkScope"
);


--
-- Name: TBLSEQUENTIALOPERATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSEQUENTIALOPERATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSEQUENTIALOPERATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSEQUENTIALOPERATION_id_seq" OWNED BY wms."TBLSEQUENTIALOPERATION".id;


--
-- Name: TBLSHIFT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSHIFT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    "businessPartnerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSHIFT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSHIFT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSHIFT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSHIFT_id_seq" OWNED BY wms."TBLSHIFT".id;


--
-- Name: TBLSTATUS; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTATUS" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facilityId" integer NOT NULL
);


--
-- Name: TBLSTATUS_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTATUS_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTATUS_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTATUS_id_seq" OWNED BY wms."TBLSTATUS".id;


--
-- Name: TBLSTOCK; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTOCK" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "locationId" integer NOT NULL,
    "productId" integer NOT NULL,
    "statusId" integer NOT NULL,
    "palletId" integer,
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "customerId" integer,
    "poNo" character varying(100),
    "poLine" character varying(100),
    "mainQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "reservedQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "unitId" integer NOT NULL,
    "netWeight" numeric(28,8),
    "grossWeight" numeric(28,8),
    "productionDate" date,
    "expiryDate" date,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSTOCKCONTROLPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTOCKCONTROLPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    "distributionType" integer,
    "customerPriority" integer,
    "shipmentPriority" integer,
    "askUser" boolean DEFAULT false NOT NULL,
    "dontUpdatePreparedQty" boolean DEFAULT false NOT NULL,
    "controlStatus" character varying(50),
    "errorOnAllSplit" boolean DEFAULT false NOT NULL,
    "controlLocation" character varying(200),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLSTOCKCONTROLPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTOCKCONTROLPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTOCKCONTROLPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTOCKCONTROLPARAMETER_id_seq" OWNED BY wms."TBLSTOCKCONTROLPARAMETER".id;


--
-- Name: TBLSTOCKCOUNT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTOCKCOUNT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "countNo" character varying(40) NOT NULL,
    "warehouseId" integer NOT NULL,
    status wms."CountStatus" DEFAULT 'DRAFT'::wms."CountStatus" NOT NULL,
    "countDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note character varying(500),
    "createdById" integer NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "countType" character varying(20),
    "materialLinkType" wms."LinkScope",
    "materialLinkId" integer,
    "userLinkType" wms."LinkScope",
    "userLinkId" integer,
    "operationTypeId" integer,
    equalize boolean DEFAULT true NOT NULL
);


--
-- Name: TBLSTOCKCOUNTLINE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTOCKCOUNTLINE" (
    id integer NOT NULL,
    "countId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "stockId" integer,
    "locationId" integer NOT NULL,
    "productId" integer NOT NULL,
    "statusId" integer NOT NULL,
    "unitId" integer NOT NULL,
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "palletId" integer,
    "systemQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "countedQty" numeric(28,8),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLSTOCKCOUNTLINE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTOCKCOUNTLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTOCKCOUNTLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTOCKCOUNTLINE_id_seq" OWNED BY wms."TBLSTOCKCOUNTLINE".id;


--
-- Name: TBLSTOCKCOUNT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTOCKCOUNT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTOCKCOUNT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTOCKCOUNT_id_seq" OWNED BY wms."TBLSTOCKCOUNT".id;


--
-- Name: TBLSTOCKLEDGER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLSTOCKLEDGER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "documentId" integer,
    "operationTypeId" integer,
    direction wms."MovementDirection" NOT NULL,
    "productId" integer NOT NULL,
    "locationId" integer NOT NULL,
    "statusId" integer NOT NULL,
    "qtyDelta" numeric(28,8) NOT NULL,
    "batchNo" character varying(50),
    "unitId" integer NOT NULL,
    "documentLineId" integer,
    "serialNo" character varying(50),
    "palletId" integer,
    "poNo" character varying(50),
    "poLine" character varying(50),
    barcode character varying(150),
    "userId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TBLSTOCKLEDGER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTOCKLEDGER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTOCKLEDGER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTOCKLEDGER_id_seq" OWNED BY wms."TBLSTOCKLEDGER".id;


--
-- Name: TBLSTOCK_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLSTOCK_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLSTOCK_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLSTOCK_id_seq" OWNED BY wms."TBLSTOCK".id;


--
-- Name: TBLTRIPBASEDCOLLECTION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLTRIPBASEDCOLLECTION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer NOT NULL,
    "sourceOperationTypeId" integer NOT NULL,
    "targetOperationTypeId" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLTRIPBASEDCOLLECTION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLTRIPBASEDCOLLECTION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLTRIPBASEDCOLLECTION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLTRIPBASEDCOLLECTION_id_seq" OWNED BY wms."TBLTRIPBASEDCOLLECTION".id;


--
-- Name: TBLUNIT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUNIT" (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL,
    "referenceCode" character varying(50),
    type wms."UnitType"
);


--
-- Name: TBLUNIT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUNIT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUNIT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUNIT_id_seq" OWNED BY wms."TBLUNIT".id;


--
-- Name: TBLUSER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSER" (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(150) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "fullName" character varying(150) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    alias character varying(60),
    "cannotChangePassword" boolean DEFAULT false NOT NULL,
    "isApproved" boolean DEFAULT true NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "passwordNeverExpires" boolean DEFAULT true NOT NULL,
    phone character varying(30),
    "userType" character varying(20),
    "validUntil" date
);


--
-- Name: TBLUSERAUTHORIZATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERAUTHORIZATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "userId" integer,
    "scopeType" wms."UserScopeType" NOT NULL,
    "referenceId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "referenceCode" character varying(60),
    "groupId" integer
);


--
-- Name: TBLUSERAUTHORIZATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUSERAUTHORIZATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUSERAUTHORIZATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUSERAUTHORIZATION_id_seq" OWNED BY wms."TBLUSERAUTHORIZATION".id;


--
-- Name: TBLUSERCOLUMNAUTH; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERCOLUMNAUTH" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "userId" integer,
    "groupId" integer,
    resource character varying(60) NOT NULL,
    "column" character varying(60) NOT NULL,
    mode wms."ColumnAuthMode" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLUSERCOLUMNAUTH_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUSERCOLUMNAUTH_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUSERCOLUMNAUTH_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUSERCOLUMNAUTH_id_seq" OWNED BY wms."TBLUSERCOLUMNAUTH".id;


--
-- Name: TBLUSERGROUP; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERGROUP" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLUSERGROUPMEMBER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERGROUPMEMBER" (
    "userId" integer NOT NULL,
    "groupId" integer NOT NULL,
    "companyId" integer
);


--
-- Name: TBLUSERGROUP_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUSERGROUP_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUSERGROUP_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUSERGROUP_id_seq" OWNED BY wms."TBLUSERGROUP".id;


--
-- Name: TBLUSERROLE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERROLE" (
    "userId" integer NOT NULL,
    "roleId" integer NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "companyId" integer
);


--
-- Name: TBLUSERSCREENRIGHT; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLUSERSCREENRIGHT" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "userId" integer,
    "groupId" integer,
    resource character varying(60) NOT NULL,
    "canView" boolean DEFAULT true NOT NULL,
    "canAdd" boolean DEFAULT true NOT NULL,
    "canEdit" boolean DEFAULT true NOT NULL,
    "canDelete" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLUSERSCREENRIGHT_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUSERSCREENRIGHT_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUSERSCREENRIGHT_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUSERSCREENRIGHT_id_seq" OWNED BY wms."TBLUSERSCREENRIGHT".id;


--
-- Name: TBLUSER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLUSER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLUSER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLUSER_id_seq" OWNED BY wms."TBLUSER".id;


--
-- Name: TBLWAREHOUSE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWAREHOUSE" (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL,
    "facilityId" integer
);


--
-- Name: TBLWAREHOUSEVEHICLE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWAREHOUSEVEHICLE" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100),
    status integer,
    pallet boolean DEFAULT false NOT NULL,
    "workType" integer,
    quantity numeric(28,8),
    "unitId" integer,
    "businessPartnerId" integer,
    "ipAddress" character varying(50),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLWAREHOUSEVEHICLE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWAREHOUSEVEHICLE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWAREHOUSEVEHICLE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWAREHOUSEVEHICLE_id_seq" OWNED BY wms."TBLWAREHOUSEVEHICLE".id;


--
-- Name: TBLWAREHOUSE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWAREHOUSE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWAREHOUSE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWAREHOUSE_id_seq" OWNED BY wms."TBLWAREHOUSE".id;


--
-- Name: TBLWORKORDER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWORKORDER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "orderNo" character varying(40) NOT NULL,
    type wms."WorkOrderType" DEFAULT 'PICK'::wms."WorkOrderType" NOT NULL,
    status wms."WorkOrderStatus" DEFAULT 'PLANNED'::wms."WorkOrderStatus" NOT NULL,
    "warehouseId" integer NOT NULL,
    "assignedToUserId" integer,
    priority integer,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    note character varying(500),
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "salesOrderId" integer
);


--
-- Name: TBLWORKORDERGENERALPARAMETER; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWORKORDERGENERALPARAMETER" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    "businessPartnerId" integer,
    "alarmDuration" integer,
    "alarmUnit" integer,
    "pickCancelOpId" integer,
    "rackFeedbackOpId" integer,
    "askEntryLocation" boolean DEFAULT false NOT NULL,
    "locationPriority" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLWORKORDERGENERALPARAMETER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWORKORDERGENERALPARAMETER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWORKORDERGENERALPARAMETER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWORKORDERGENERALPARAMETER_id_seq" OWNED BY wms."TBLWORKORDERGENERALPARAMETER".id;


--
-- Name: TBLWORKORDERLINE; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWORKORDERLINE" (
    id integer NOT NULL,
    "workOrderId" integer NOT NULL,
    "lineNo" integer NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    quantity numeric(28,8) NOT NULL,
    "collectedQty" numeric(28,8) DEFAULT 0 NOT NULL,
    "sourceLocationId" integer,
    "targetLocationId" integer,
    "sourceStatusId" integer,
    "targetStatusId" integer,
    "palletId" integer,
    "batchNo" character varying(100),
    "serialNo" character varying(100),
    "reasonId" integer,
    note character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer NOT NULL
);


--
-- Name: TBLWORKORDERLINE_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWORKORDERLINE_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWORKORDERLINE_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWORKORDERLINE_id_seq" OWNED BY wms."TBLWORKORDERLINE".id;


--
-- Name: TBLWORKORDERREASON; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWORKORDERREASON" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    code character varying(20) NOT NULL,
    description character varying(200),
    "isCancel" boolean DEFAULT false NOT NULL,
    "autoCreateOrder" boolean DEFAULT false NOT NULL,
    "businessPartnerId" integer,
    "createDocument" boolean DEFAULT false NOT NULL,
    "clearSystemFault" boolean DEFAULT false NOT NULL,
    "breakPassword" character varying(100),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLWORKORDERREASON_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWORKORDERREASON_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWORKORDERREASON_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWORKORDERREASON_id_seq" OWNED BY wms."TBLWORKORDERREASON".id;


--
-- Name: TBLWORKORDERREFERENCEOPERATION; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms."TBLWORKORDERREFERENCEOPERATION" (
    id integer NOT NULL,
    "companyId" integer NOT NULL,
    category integer,
    "operationTypeId" integer NOT NULL,
    "businessPartnerId" integer,
    "headerId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TBLWORKORDERREFERENCEOPERATION_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWORKORDERREFERENCEOPERATION_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWORKORDERREFERENCEOPERATION_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWORKORDERREFERENCEOPERATION_id_seq" OWNED BY wms."TBLWORKORDERREFERENCEOPERATION".id;


--
-- Name: TBLWORKORDER_id_seq; Type: SEQUENCE; Schema: wms; Owner: -
--

CREATE SEQUENCE wms."TBLWORKORDER_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TBLWORKORDER_id_seq; Type: SEQUENCE OWNED BY; Schema: wms; Owner: -
--

ALTER SEQUENCE wms."TBLWORKORDER_id_seq" OWNED BY wms."TBLWORKORDER".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: wms; Owner: -
--

CREATE TABLE wms._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: TBLINVOICE id; Type: DEFAULT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance."TBLINVOICE" ALTER COLUMN id SET DEFAULT nextval('finance."TBLINVOICE_id_seq"'::regclass);


--
-- Name: TBLINVOICELINE id; Type: DEFAULT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance."TBLINVOICELINE" ALTER COLUMN id SET DEFAULT nextval('finance."TBLINVOICELINE_id_seq"'::regclass);


--
-- Name: TBLSHIPMENT id; Type: DEFAULT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENT" ALTER COLUMN id SET DEFAULT nextval('logistics."TBLSHIPMENT_id_seq"'::regclass);


--
-- Name: TBLSHIPMENTSTOP id; Type: DEFAULT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENTSTOP" ALTER COLUMN id SET DEFAULT nextval('logistics."TBLSHIPMENTSTOP_id_seq"'::regclass);


--
-- Name: TBLVEHICLE id; Type: DEFAULT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLVEHICLE" ALTER COLUMN id SET DEFAULT nextval('logistics."TBLVEHICLE_id_seq"'::regclass);


--
-- Name: TBLPURCHASEORDER id; Type: DEFAULT; Schema: procurement; Owner: -
--

ALTER TABLE ONLY procurement."TBLPURCHASEORDER" ALTER COLUMN id SET DEFAULT nextval('procurement."TBLPURCHASEORDER_id_seq"'::regclass);


--
-- Name: TBLPURCHASEORDERLINE id; Type: DEFAULT; Schema: procurement; Owner: -
--

ALTER TABLE ONLY procurement."TBLPURCHASEORDERLINE" ALTER COLUMN id SET DEFAULT nextval('procurement."TBLPURCHASEORDERLINE_id_seq"'::regclass);


--
-- Name: TBLSALESALLOCATION id; Type: DEFAULT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESALLOCATION" ALTER COLUMN id SET DEFAULT nextval('sales."TBLSALESALLOCATION_id_seq"'::regclass);


--
-- Name: TBLSALESORDER id; Type: DEFAULT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESORDER" ALTER COLUMN id SET DEFAULT nextval('sales."TBLSALESORDER_id_seq"'::regclass);


--
-- Name: TBLSALESORDERLINE id; Type: DEFAULT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESORDERLINE" ALTER COLUMN id SET DEFAULT nextval('sales."TBLSALESORDERLINE_id_seq"'::regclass);


--
-- Name: TBLAREA id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAREA" ALTER COLUMN id SET DEFAULT nextval('wms."TBLAREA_id_seq"'::regclass);


--
-- Name: TBLAUTOREFERENCEDOCUMENT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAUTOREFERENCEDOCUMENT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLAUTOREFERENCEDOCUMENT_id_seq"'::regclass);


--
-- Name: TBLBARCODETYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBARCODETYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLBARCODETYPE_id_seq"'::regclass);


--
-- Name: TBLBUSINESSPARTNER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLBUSINESSPARTNER_id_seq"'::regclass);


--
-- Name: TBLCOMPANY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOMPANY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCOMPANY_id_seq"'::regclass);


--
-- Name: TBLCONDITIONBREAKLOG id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONDITIONBREAKLOG" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCONDITIONBREAKLOG_id_seq"'::regclass);


--
-- Name: TBLCONTROLCOUNT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONTROLCOUNT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCONTROLCOUNT_id_seq"'::regclass);


--
-- Name: TBLCONTROLCOUNTLINE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONTROLCOUNTLINE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCONTROLCOUNTLINE_id_seq"'::regclass);


--
-- Name: TBLCOUNTAPPROVALUSERGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTAPPROVALUSERGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCOUNTAPPROVALUSERGROUP_id_seq"'::regclass);


--
-- Name: TBLCOUNTASSIGNMENT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTASSIGNMENT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCOUNTASSIGNMENT_id_seq"'::regclass);


--
-- Name: TBLCOUNTCRITERIA id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTCRITERIA" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCOUNTCRITERIA_id_seq"'::regclass);


--
-- Name: TBLCOUNTPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLCOUNTPARAMETER_id_seq"'::regclass);


--
-- Name: TBLDASHBOARDREPORT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDASHBOARDREPORT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDASHBOARDREPORT_id_seq"'::regclass);


--
-- Name: TBLDOCUMENT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENT_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTAPPROVALTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTAPPROVALTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTAPPROVALTYPE_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTASSIGNMENT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTASSIGNMENT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTASSIGNMENT_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTLINE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTLINE_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTLINESCOPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINESCOPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTLINESCOPE_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTPLANNINGPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTPLANNINGPARAMETER_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTSTATUS id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUS" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTSTATUS_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTSTATUSACTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSACTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTSTATUSACTION_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTSTATUSCRITERIA id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSCRITERIA" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTSTATUSCRITERIA_id_seq"'::regclass);


--
-- Name: TBLDOCUMENTSTATUSHISTORY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSHISTORY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLDOCUMENTSTATUSHISTORY_id_seq"'::regclass);


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONBREAKPASSWORD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLENTRYCONDITIONBREAKPASSWORD_id_seq"'::regclass);


--
-- Name: TBLENTRYCONDITIONBREAKREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONBREAKREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLENTRYCONDITIONBREAKREASON_id_seq"'::regclass);


--
-- Name: TBLENTRYCONDITIONPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLENTRYCONDITIONPARAMETER_id_seq"'::regclass);


--
-- Name: TBLENTRYCONDITIONTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLENTRYCONDITIONTYPE_id_seq"'::regclass);


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONTYPEOPERATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLENTRYCONDITIONTYPEOPERATION_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONBREAKPASSWORD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONBREAKPASSWORD_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONBREAKREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONBREAKREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONBREAKREASON_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONCONTROLFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONCONTROLFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONCONTROLFIELD_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONPARAMETER_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONTYPE_id_seq"'::regclass);


--
-- Name: TBLEXITCONDITIONTYPEOPERATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONTYPEOPERATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXITCONDITIONTYPEOPERATION_id_seq"'::regclass);


--
-- Name: TBLEXTRAFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXTRAFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXTRAFIELD_id_seq"'::regclass);


--
-- Name: TBLEXTRAFIELDOPTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXTRAFIELDOPTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLEXTRAFIELDOPTION_id_seq"'::regclass);


--
-- Name: TBLFACILITY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLFACILITY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLFACILITY_id_seq"'::regclass);


--
-- Name: TBLHANDHELDMENUGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLHANDHELDMENUGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLHANDHELDMENUGROUP_id_seq"'::regclass);


--
-- Name: TBLHANDHELDMENUITEM id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLHANDHELDMENUITEM" ALTER COLUMN id SET DEFAULT nextval('wms."TBLHANDHELDMENUITEM_id_seq"'::regclass);


--
-- Name: TBLINTEGRATIONLOG id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINTEGRATIONLOG" ALTER COLUMN id SET DEFAULT nextval('wms."TBLINTEGRATIONLOG_id_seq"'::regclass);


--
-- Name: TBLINVENTORYRULE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINVENTORYRULE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLINVENTORYRULE_id_seq"'::regclass);


--
-- Name: TBLLABELTEMPLATE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLABELTEMPLATE_id_seq"'::regclass);


--
-- Name: TBLLABELTEMPLATEITEM id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEITEM" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLABELTEMPLATEITEM_id_seq"'::regclass);


--
-- Name: TBLLABELTEMPLATEQUERY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEQUERY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLABELTEMPLATEQUERY_id_seq"'::regclass);


--
-- Name: TBLLABELTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLABELTYPE_id_seq"'::regclass);


--
-- Name: TBLLANGUAGE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLANGUAGE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLANGUAGE_id_seq"'::regclass);


--
-- Name: TBLLOCATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLOCATION_id_seq"'::regclass);


--
-- Name: TBLLOCATIONCAPACITY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONCAPACITY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLOCATIONCAPACITY_id_seq"'::regclass);


--
-- Name: TBLLOCATIONGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLOCATIONGROUP_id_seq"'::regclass);


--
-- Name: TBLLOCATIONGROUPLINK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUPLINK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLLOCATIONGROUPLINK_id_seq"'::regclass);


--
-- Name: TBLMENUGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLMENUGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLMENUGROUP_id_seq"'::regclass);


--
-- Name: TBLOPERATIONGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONGROUP_id_seq"'::regclass);


--
-- Name: TBLOPERATIONGROUPLINK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONGROUPLINK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONGROUPLINK_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPE_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPEBULKACTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEBULKACTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPEBULKACTION_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPECONVERSION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPECONVERSION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPECONVERSION_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEEXTRAFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPEEXTRAFIELD_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEFORBIDDENPRODUCT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPEFORBIDDENPRODUCT_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPELOCATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPELOCATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPELOCATION_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPEPALLETTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEPALLETTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPEPALLETTYPE_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPEREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPEREASON_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPESTATUS id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPESTATUS" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPESTATUS_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPETOLERANCE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPETOLERANCE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPETOLERANCE_id_seq"'::regclass);


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPETOLERANCEDETAIL" ALTER COLUMN id SET DEFAULT nextval('wms."TBLOPERATIONTYPETOLERANCEDETAIL_id_seq"'::regclass);


--
-- Name: TBLPALLET id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPALLET_id_seq"'::regclass);


--
-- Name: TBLPALLETHISTORY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETHISTORY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPALLETHISTORY_id_seq"'::regclass);


--
-- Name: TBLPALLETNOTIFICATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETNOTIFICATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPALLETNOTIFICATION_id_seq"'::regclass);


--
-- Name: TBLPALLETNOTIFICATIONLINE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETNOTIFICATIONLINE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPALLETNOTIFICATIONLINE_id_seq"'::regclass);


--
-- Name: TBLPALLETTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPALLETTYPE_id_seq"'::regclass);


--
-- Name: TBLPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARAMETER_id_seq"'::regclass);


--
-- Name: TBLPARTNERACCEPTANCETIME id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERACCEPTANCETIME" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNERACCEPTANCETIME_id_seq"'::regclass);


--
-- Name: TBLPARTNEREXTRAFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNEREXTRAFIELD_id_seq"'::regclass);


--
-- Name: TBLPARTNEREXTRAFIELDDEF id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELDDEF" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNEREXTRAFIELDDEF_id_seq"'::regclass);


--
-- Name: TBLPARTNEREXTRAGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNEREXTRAGROUP_id_seq"'::regclass);


--
-- Name: TBLPARTNEREXTRAGROUPLINK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUPLINK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNEREXTRAGROUPLINK_id_seq"'::regclass);


--
-- Name: TBLPARTNERFACILITY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERFACILITY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNERFACILITY_id_seq"'::regclass);


--
-- Name: TBLPARTNERGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNERGROUP_id_seq"'::regclass);


--
-- Name: TBLPARTNEROPTIMIZATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEROPTIMIZATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPARTNEROPTIMIZATION_id_seq"'::regclass);


--
-- Name: TBLPICKORDERPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPICKORDERPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPICKORDERPARAMETER_id_seq"'::regclass);


--
-- Name: TBLPRINTER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRINTER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRINTER_id_seq"'::regclass);


--
-- Name: TBLPRODUCT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCT_id_seq"'::regclass);


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTADDITIONALGROUPLINK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTADDITIONALGROUPLINK_id_seq"'::regclass);


--
-- Name: TBLPRODUCTBASEDCOLLECTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTBASEDCOLLECTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTBASEDCOLLECTION_id_seq"'::regclass);


--
-- Name: TBLPRODUCTDETAILTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTDETAILTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTDETAILTYPE_id_seq"'::regclass);


--
-- Name: TBLPRODUCTFACILITY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTFACILITY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTFACILITY_id_seq"'::regclass);


--
-- Name: TBLPRODUCTGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTGROUP_id_seq"'::regclass);


--
-- Name: TBLPRODUCTSUBGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTSUBGROUP_id_seq"'::regclass);


--
-- Name: TBLPRODUCTSUBSTITUTE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBSTITUTE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTSUBSTITUTE_id_seq"'::regclass);


--
-- Name: TBLPRODUCTTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTTYPE_id_seq"'::regclass);


--
-- Name: TBLPRODUCTUNIT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNIT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTUNIT_id_seq"'::regclass);


--
-- Name: TBLPRODUCTUNITBARCODE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNITBARCODE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLPRODUCTUNITBARCODE_id_seq"'::regclass);


--
-- Name: TBLQUALITYINSPECTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLQUALITYINSPECTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLQUALITYINSPECTION_id_seq"'::regclass);


--
-- Name: TBLRACKFEEDPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLRACKFEEDPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLRACKFEEDPARAMETER_id_seq"'::regclass);


--
-- Name: TBLREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREASON_id_seq"'::regclass);


--
-- Name: TBLREASONCATEGORY id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREASONCATEGORY" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREASONCATEGORY_id_seq"'::regclass);


--
-- Name: TBLREGION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREGION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREGION_id_seq"'::regclass);


--
-- Name: TBLREPORTCRITERIA id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTCRITERIA" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREPORTCRITERIA_id_seq"'::regclass);


--
-- Name: TBLREPORTDEF id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTDEF" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREPORTDEF_id_seq"'::regclass);


--
-- Name: TBLREPORTFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLREPORTFIELD_id_seq"'::regclass);


--
-- Name: TBLROLE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROLE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROLE_id_seq"'::regclass);


--
-- Name: TBLROUTINGBREAKPASSWORD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGBREAKPASSWORD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGBREAKPASSWORD_id_seq"'::regclass);


--
-- Name: TBLROUTINGBREAKREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGBREAKREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGBREAKREASON_id_seq"'::regclass);


--
-- Name: TBLROUTINGCONTROLFIELD id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGCONTROLFIELD" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGCONTROLFIELD_id_seq"'::regclass);


--
-- Name: TBLROUTINGPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGPARAMETER_id_seq"'::regclass);


--
-- Name: TBLROUTINGPRODUCTLOCATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGPRODUCTLOCATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGPRODUCTLOCATION_id_seq"'::regclass);


--
-- Name: TBLROUTINGRULE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGRULE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGRULE_id_seq"'::regclass);


--
-- Name: TBLROUTINGTYPE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGTYPE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGTYPE_id_seq"'::regclass);


--
-- Name: TBLROUTINGTYPEOPERATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGTYPEOPERATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLROUTINGTYPEOPERATION_id_seq"'::regclass);


--
-- Name: TBLSCREENREPORTLINK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSCREENREPORTLINK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSCREENREPORTLINK_id_seq"'::regclass);


--
-- Name: TBLSEQUENCE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSEQUENCE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSEQUENCE_id_seq"'::regclass);


--
-- Name: TBLSEQUENTIALOPERATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSEQUENTIALOPERATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSEQUENTIALOPERATION_id_seq"'::regclass);


--
-- Name: TBLSHIFT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSHIFT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSHIFT_id_seq"'::regclass);


--
-- Name: TBLSTATUS id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTATUS" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTATUS_id_seq"'::regclass);


--
-- Name: TBLSTOCK id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTOCK_id_seq"'::regclass);


--
-- Name: TBLSTOCKCONTROLPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCONTROLPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTOCKCONTROLPARAMETER_id_seq"'::regclass);


--
-- Name: TBLSTOCKCOUNT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCOUNT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTOCKCOUNT_id_seq"'::regclass);


--
-- Name: TBLSTOCKCOUNTLINE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCOUNTLINE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTOCKCOUNTLINE_id_seq"'::regclass);


--
-- Name: TBLSTOCKLEDGER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKLEDGER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLSTOCKLEDGER_id_seq"'::regclass);


--
-- Name: TBLTRIPBASEDCOLLECTION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLTRIPBASEDCOLLECTION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLTRIPBASEDCOLLECTION_id_seq"'::regclass);


--
-- Name: TBLUNIT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUNIT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUNIT_id_seq"'::regclass);


--
-- Name: TBLUSER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUSER_id_seq"'::regclass);


--
-- Name: TBLUSERAUTHORIZATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERAUTHORIZATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUSERAUTHORIZATION_id_seq"'::regclass);


--
-- Name: TBLUSERCOLUMNAUTH id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERCOLUMNAUTH" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUSERCOLUMNAUTH_id_seq"'::regclass);


--
-- Name: TBLUSERGROUP id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUP" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUSERGROUP_id_seq"'::regclass);


--
-- Name: TBLUSERSCREENRIGHT id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERSCREENRIGHT" ALTER COLUMN id SET DEFAULT nextval('wms."TBLUSERSCREENRIGHT_id_seq"'::regclass);


--
-- Name: TBLWAREHOUSE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWAREHOUSE_id_seq"'::regclass);


--
-- Name: TBLWAREHOUSEVEHICLE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSEVEHICLE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWAREHOUSEVEHICLE_id_seq"'::regclass);


--
-- Name: TBLWORKORDER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWORKORDER_id_seq"'::regclass);


--
-- Name: TBLWORKORDERGENERALPARAMETER id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERGENERALPARAMETER" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWORKORDERGENERALPARAMETER_id_seq"'::regclass);


--
-- Name: TBLWORKORDERLINE id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERLINE" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWORKORDERLINE_id_seq"'::regclass);


--
-- Name: TBLWORKORDERREASON id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERREASON" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWORKORDERREASON_id_seq"'::regclass);


--
-- Name: TBLWORKORDERREFERENCEOPERATION id; Type: DEFAULT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERREFERENCEOPERATION" ALTER COLUMN id SET DEFAULT nextval('wms."TBLWORKORDERREFERENCEOPERATION_id_seq"'::regclass);


--
-- Name: TBLINVOICELINE TBLINVOICELINE_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance."TBLINVOICELINE"
    ADD CONSTRAINT "TBLINVOICELINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLINVOICE TBLINVOICE_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance."TBLINVOICE"
    ADD CONSTRAINT "TBLINVOICE_pkey" PRIMARY KEY (id);


--
-- Name: TBLSHIPMENTSTOP TBLSHIPMENTSTOP_pkey; Type: CONSTRAINT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENTSTOP"
    ADD CONSTRAINT "TBLSHIPMENTSTOP_pkey" PRIMARY KEY (id);


--
-- Name: TBLSHIPMENT TBLSHIPMENT_pkey; Type: CONSTRAINT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENT"
    ADD CONSTRAINT "TBLSHIPMENT_pkey" PRIMARY KEY (id);


--
-- Name: TBLVEHICLE TBLVEHICLE_pkey; Type: CONSTRAINT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLVEHICLE"
    ADD CONSTRAINT "TBLVEHICLE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPURCHASEORDERLINE TBLPURCHASEORDERLINE_pkey; Type: CONSTRAINT; Schema: procurement; Owner: -
--

ALTER TABLE ONLY procurement."TBLPURCHASEORDERLINE"
    ADD CONSTRAINT "TBLPURCHASEORDERLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPURCHASEORDER TBLPURCHASEORDER_pkey; Type: CONSTRAINT; Schema: procurement; Owner: -
--

ALTER TABLE ONLY procurement."TBLPURCHASEORDER"
    ADD CONSTRAINT "TBLPURCHASEORDER_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: TBLSALESALLOCATION TBLSALESALLOCATION_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESALLOCATION"
    ADD CONSTRAINT "TBLSALESALLOCATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLSALESORDERLINE TBLSALESORDERLINE_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESORDERLINE"
    ADD CONSTRAINT "TBLSALESORDERLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLSALESORDER TBLSALESORDER_pkey; Type: CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESORDER"
    ADD CONSTRAINT "TBLSALESORDER_pkey" PRIMARY KEY (id);


--
-- Name: TBLAREA TBLAREA_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAREA"
    ADD CONSTRAINT "TBLAREA_pkey" PRIMARY KEY (id);


--
-- Name: TBLAUTOREFERENCEDOCUMENT TBLAUTOREFERENCEDOCUMENT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAUTOREFERENCEDOCUMENT"
    ADD CONSTRAINT "TBLAUTOREFERENCEDOCUMENT_pkey" PRIMARY KEY (id);


--
-- Name: TBLBARCODETYPE TBLBARCODETYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBARCODETYPE"
    ADD CONSTRAINT "TBLBARCODETYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLBUSINESSPARTNER TBLBUSINESSPARTNER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER"
    ADD CONSTRAINT "TBLBUSINESSPARTNER_pkey" PRIMARY KEY (id);


--
-- Name: TBLCOMPANY TBLCOMPANY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOMPANY"
    ADD CONSTRAINT "TBLCOMPANY_pkey" PRIMARY KEY (id);


--
-- Name: TBLCONDITIONBREAKLOG TBLCONDITIONBREAKLOG_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONDITIONBREAKLOG"
    ADD CONSTRAINT "TBLCONDITIONBREAKLOG_pkey" PRIMARY KEY (id);


--
-- Name: TBLCONTROLCOUNTLINE TBLCONTROLCOUNTLINE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONTROLCOUNTLINE"
    ADD CONSTRAINT "TBLCONTROLCOUNTLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLCONTROLCOUNT TBLCONTROLCOUNT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONTROLCOUNT"
    ADD CONSTRAINT "TBLCONTROLCOUNT_pkey" PRIMARY KEY (id);


--
-- Name: TBLCOUNTAPPROVALUSERGROUP TBLCOUNTAPPROVALUSERGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTAPPROVALUSERGROUP"
    ADD CONSTRAINT "TBLCOUNTAPPROVALUSERGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLCOUNTASSIGNMENT TBLCOUNTASSIGNMENT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTASSIGNMENT"
    ADD CONSTRAINT "TBLCOUNTASSIGNMENT_pkey" PRIMARY KEY (id);


--
-- Name: TBLCOUNTCRITERIA TBLCOUNTCRITERIA_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTCRITERIA"
    ADD CONSTRAINT "TBLCOUNTCRITERIA_pkey" PRIMARY KEY (id);


--
-- Name: TBLCOUNTPARAMETER TBLCOUNTPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCOUNTPARAMETER"
    ADD CONSTRAINT "TBLCOUNTPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLDASHBOARDREPORT TBLDASHBOARDREPORT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDASHBOARDREPORT"
    ADD CONSTRAINT "TBLDASHBOARDREPORT_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTAPPROVALTYPE TBLDOCUMENTAPPROVALTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTAPPROVALTYPE"
    ADD CONSTRAINT "TBLDOCUMENTAPPROVALTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTASSIGNMENT TBLDOCUMENTASSIGNMENT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTASSIGNMENT"
    ADD CONSTRAINT "TBLDOCUMENTASSIGNMENT_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTLINESCOPE TBLDOCUMENTLINESCOPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINESCOPE"
    ADD CONSTRAINT "TBLDOCUMENTLINESCOPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER TBLDOCUMENTPLANNINGPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTPLANNINGPARAMETER"
    ADD CONSTRAINT "TBLDOCUMENTPLANNINGPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTSTATUSACTION TBLDOCUMENTSTATUSACTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSACTION"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSACTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTSTATUSCRITERIA TBLDOCUMENTSTATUSCRITERIA_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSCRITERIA"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSCRITERIA_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTSTATUSHISTORY TBLDOCUMENTSTATUSHISTORY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSHISTORY"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSHISTORY_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENTSTATUS TBLDOCUMENTSTATUS_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUS"
    ADD CONSTRAINT "TBLDOCUMENTSTATUS_pkey" PRIMARY KEY (id);


--
-- Name: TBLDOCUMENT TBLDOCUMENT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_pkey" PRIMARY KEY (id);


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD TBLENTRYCONDITIONBREAKPASSWORD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONBREAKPASSWORD"
    ADD CONSTRAINT "TBLENTRYCONDITIONBREAKPASSWORD_pkey" PRIMARY KEY (id);


--
-- Name: TBLENTRYCONDITIONBREAKREASON TBLENTRYCONDITIONBREAKREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONBREAKREASON"
    ADD CONSTRAINT "TBLENTRYCONDITIONBREAKREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLENTRYCONDITIONPARAMETER TBLENTRYCONDITIONPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONPARAMETER"
    ADD CONSTRAINT "TBLENTRYCONDITIONPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION TBLENTRYCONDITIONTYPEOPERATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONTYPEOPERATION"
    ADD CONSTRAINT "TBLENTRYCONDITIONTYPEOPERATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLENTRYCONDITIONTYPE TBLENTRYCONDITIONTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONTYPE"
    ADD CONSTRAINT "TBLENTRYCONDITIONTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD TBLEXITCONDITIONBREAKPASSWORD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONBREAKPASSWORD"
    ADD CONSTRAINT "TBLEXITCONDITIONBREAKPASSWORD_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONBREAKREASON TBLEXITCONDITIONBREAKREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONBREAKREASON"
    ADD CONSTRAINT "TBLEXITCONDITIONBREAKREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONCONTROLFIELD TBLEXITCONDITIONCONTROLFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONCONTROLFIELD"
    ADD CONSTRAINT "TBLEXITCONDITIONCONTROLFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONPARAMETER TBLEXITCONDITIONPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONPARAMETER"
    ADD CONSTRAINT "TBLEXITCONDITIONPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONTYPEOPERATION TBLEXITCONDITIONTYPEOPERATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONTYPEOPERATION"
    ADD CONSTRAINT "TBLEXITCONDITIONTYPEOPERATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXITCONDITIONTYPE TBLEXITCONDITIONTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONTYPE"
    ADD CONSTRAINT "TBLEXITCONDITIONTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXTRAFIELDOPTION TBLEXTRAFIELDOPTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXTRAFIELDOPTION"
    ADD CONSTRAINT "TBLEXTRAFIELDOPTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLEXTRAFIELD TBLEXTRAFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXTRAFIELD"
    ADD CONSTRAINT "TBLEXTRAFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLFACILITY TBLFACILITY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLFACILITY"
    ADD CONSTRAINT "TBLFACILITY_pkey" PRIMARY KEY (id);


--
-- Name: TBLHANDHELDMENUGROUP TBLHANDHELDMENUGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLHANDHELDMENUGROUP"
    ADD CONSTRAINT "TBLHANDHELDMENUGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLHANDHELDMENUITEM TBLHANDHELDMENUITEM_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLHANDHELDMENUITEM"
    ADD CONSTRAINT "TBLHANDHELDMENUITEM_pkey" PRIMARY KEY (id);


--
-- Name: TBLINTEGRATIONLOG TBLINTEGRATIONLOG_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINTEGRATIONLOG"
    ADD CONSTRAINT "TBLINTEGRATIONLOG_pkey" PRIMARY KEY (id);


--
-- Name: TBLINVENTORYRULE TBLINVENTORYRULE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINVENTORYRULE"
    ADD CONSTRAINT "TBLINVENTORYRULE_pkey" PRIMARY KEY (id);


--
-- Name: TBLLABELTEMPLATEITEM TBLLABELTEMPLATEITEM_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEITEM"
    ADD CONSTRAINT "TBLLABELTEMPLATEITEM_pkey" PRIMARY KEY (id);


--
-- Name: TBLLABELTEMPLATEQUERY TBLLABELTEMPLATEQUERY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEQUERY"
    ADD CONSTRAINT "TBLLABELTEMPLATEQUERY_pkey" PRIMARY KEY (id);


--
-- Name: TBLLABELTEMPLATE TBLLABELTEMPLATE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATE"
    ADD CONSTRAINT "TBLLABELTEMPLATE_pkey" PRIMARY KEY (id);


--
-- Name: TBLLABELTYPE TBLLABELTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTYPE"
    ADD CONSTRAINT "TBLLABELTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLLANGUAGE TBLLANGUAGE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLANGUAGE"
    ADD CONSTRAINT "TBLLANGUAGE_pkey" PRIMARY KEY (id);


--
-- Name: TBLLOCATIONCAPACITY TBLLOCATIONCAPACITY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONCAPACITY"
    ADD CONSTRAINT "TBLLOCATIONCAPACITY_pkey" PRIMARY KEY (id);


--
-- Name: TBLLOCATIONGROUPLINK TBLLOCATIONGROUPLINK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUPLINK"
    ADD CONSTRAINT "TBLLOCATIONGROUPLINK_pkey" PRIMARY KEY (id);


--
-- Name: TBLLOCATIONGROUP TBLLOCATIONGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUP"
    ADD CONSTRAINT "TBLLOCATIONGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLLOCATION TBLLOCATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLMENUGROUP TBLMENUGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLMENUGROUP"
    ADD CONSTRAINT "TBLMENUGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONGROUPLINK TBLOPERATIONGROUPLINK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONGROUPLINK"
    ADD CONSTRAINT "TBLOPERATIONGROUPLINK_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONGROUP TBLOPERATIONGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONGROUP"
    ADD CONSTRAINT "TBLOPERATIONGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPEBULKACTION TBLOPERATIONTYPEBULKACTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEBULKACTION"
    ADD CONSTRAINT "TBLOPERATIONTYPEBULKACTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPECONVERSION TBLOPERATIONTYPECONVERSION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPECONVERSION"
    ADD CONSTRAINT "TBLOPERATIONTYPECONVERSION_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD TBLOPERATIONTYPEEXTRAFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEEXTRAFIELD"
    ADD CONSTRAINT "TBLOPERATIONTYPEEXTRAFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT TBLOPERATIONTYPEFORBIDDENPRODUCT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEFORBIDDENPRODUCT"
    ADD CONSTRAINT "TBLOPERATIONTYPEFORBIDDENPRODUCT_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPELOCATION TBLOPERATIONTYPELOCATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPELOCATION"
    ADD CONSTRAINT "TBLOPERATIONTYPELOCATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPEPALLETTYPE TBLOPERATIONTYPEPALLETTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEPALLETTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPEPALLETTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPEREASON TBLOPERATIONTYPEREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEREASON"
    ADD CONSTRAINT "TBLOPERATIONTYPEREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPESTATUS TBLOPERATIONTYPESTATUS_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPESTATUS"
    ADD CONSTRAINT "TBLOPERATIONTYPESTATUS_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL TBLOPERATIONTYPETOLERANCEDETAIL_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPETOLERANCEDETAIL"
    ADD CONSTRAINT "TBLOPERATIONTYPETOLERANCEDETAIL_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPETOLERANCE TBLOPERATIONTYPETOLERANCE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPETOLERANCE"
    ADD CONSTRAINT "TBLOPERATIONTYPETOLERANCE_pkey" PRIMARY KEY (id);


--
-- Name: TBLOPERATIONTYPE TBLOPERATIONTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPALLETHISTORY TBLPALLETHISTORY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETHISTORY"
    ADD CONSTRAINT "TBLPALLETHISTORY_pkey" PRIMARY KEY (id);


--
-- Name: TBLPALLETNOTIFICATIONLINE TBLPALLETNOTIFICATIONLINE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETNOTIFICATIONLINE"
    ADD CONSTRAINT "TBLPALLETNOTIFICATIONLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPALLETNOTIFICATION TBLPALLETNOTIFICATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETNOTIFICATION"
    ADD CONSTRAINT "TBLPALLETNOTIFICATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLPALLETTYPE TBLPALLETTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETTYPE"
    ADD CONSTRAINT "TBLPALLETTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPALLET TBLPALLET_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET"
    ADD CONSTRAINT "TBLPALLET_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARAMETER TBLPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARAMETER"
    ADD CONSTRAINT "TBLPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNERACCEPTANCETIME TBLPARTNERACCEPTANCETIME_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERACCEPTANCETIME"
    ADD CONSTRAINT "TBLPARTNERACCEPTANCETIME_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNEREXTRAFIELDDEF TBLPARTNEREXTRAFIELDDEF_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELDDEF"
    ADD CONSTRAINT "TBLPARTNEREXTRAFIELDDEF_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNEREXTRAFIELD TBLPARTNEREXTRAFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELD"
    ADD CONSTRAINT "TBLPARTNEREXTRAFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNEREXTRAGROUPLINK TBLPARTNEREXTRAGROUPLINK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUPLINK"
    ADD CONSTRAINT "TBLPARTNEREXTRAGROUPLINK_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNEREXTRAGROUP TBLPARTNEREXTRAGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUP"
    ADD CONSTRAINT "TBLPARTNEREXTRAGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNERFACILITY TBLPARTNERFACILITY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERFACILITY"
    ADD CONSTRAINT "TBLPARTNERFACILITY_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNERGROUP TBLPARTNERGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERGROUP"
    ADD CONSTRAINT "TBLPARTNERGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLPARTNEROPTIMIZATION TBLPARTNEROPTIMIZATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEROPTIMIZATION"
    ADD CONSTRAINT "TBLPARTNEROPTIMIZATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLPICKORDERPARAMETER TBLPICKORDERPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPICKORDERPARAMETER"
    ADD CONSTRAINT "TBLPICKORDERPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRINTER TBLPRINTER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRINTER"
    ADD CONSTRAINT "TBLPRINTER_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK TBLPRODUCTADDITIONALGROUPLINK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTADDITIONALGROUPLINK"
    ADD CONSTRAINT "TBLPRODUCTADDITIONALGROUPLINK_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTBASEDCOLLECTION TBLPRODUCTBASEDCOLLECTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTBASEDCOLLECTION"
    ADD CONSTRAINT "TBLPRODUCTBASEDCOLLECTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTDETAILTYPE TBLPRODUCTDETAILTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTDETAILTYPE"
    ADD CONSTRAINT "TBLPRODUCTDETAILTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTFACILITY TBLPRODUCTFACILITY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTFACILITY"
    ADD CONSTRAINT "TBLPRODUCTFACILITY_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTGROUP TBLPRODUCTGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTGROUP"
    ADD CONSTRAINT "TBLPRODUCTGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTSUBGROUP TBLPRODUCTSUBGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBGROUP"
    ADD CONSTRAINT "TBLPRODUCTSUBGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTSUBSTITUTE TBLPRODUCTSUBSTITUTE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBSTITUTE"
    ADD CONSTRAINT "TBLPRODUCTSUBSTITUTE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTTYPE TBLPRODUCTTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTTYPE"
    ADD CONSTRAINT "TBLPRODUCTTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTUNITBARCODE TBLPRODUCTUNITBARCODE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNITBARCODE"
    ADD CONSTRAINT "TBLPRODUCTUNITBARCODE_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCTUNIT TBLPRODUCTUNIT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNIT"
    ADD CONSTRAINT "TBLPRODUCTUNIT_pkey" PRIMARY KEY (id);


--
-- Name: TBLPRODUCT TBLPRODUCT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_pkey" PRIMARY KEY (id);


--
-- Name: TBLQUALITYINSPECTION TBLQUALITYINSPECTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLQUALITYINSPECTION"
    ADD CONSTRAINT "TBLQUALITYINSPECTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLRACKFEEDPARAMETER TBLRACKFEEDPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLRACKFEEDPARAMETER"
    ADD CONSTRAINT "TBLRACKFEEDPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLREASONCATEGORY TBLREASONCATEGORY_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREASONCATEGORY"
    ADD CONSTRAINT "TBLREASONCATEGORY_pkey" PRIMARY KEY (id);


--
-- Name: TBLREASON TBLREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREASON"
    ADD CONSTRAINT "TBLREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLREGION TBLREGION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREGION"
    ADD CONSTRAINT "TBLREGION_pkey" PRIMARY KEY (id);


--
-- Name: TBLREPORTCRITERIA TBLREPORTCRITERIA_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTCRITERIA"
    ADD CONSTRAINT "TBLREPORTCRITERIA_pkey" PRIMARY KEY (id);


--
-- Name: TBLREPORTDEF TBLREPORTDEF_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTDEF"
    ADD CONSTRAINT "TBLREPORTDEF_pkey" PRIMARY KEY (id);


--
-- Name: TBLREPORTFIELD TBLREPORTFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTFIELD"
    ADD CONSTRAINT "TBLREPORTFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLROLE TBLROLE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROLE"
    ADD CONSTRAINT "TBLROLE_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGBREAKPASSWORD TBLROUTINGBREAKPASSWORD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGBREAKPASSWORD"
    ADD CONSTRAINT "TBLROUTINGBREAKPASSWORD_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGBREAKREASON TBLROUTINGBREAKREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGBREAKREASON"
    ADD CONSTRAINT "TBLROUTINGBREAKREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGCONTROLFIELD TBLROUTINGCONTROLFIELD_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGCONTROLFIELD"
    ADD CONSTRAINT "TBLROUTINGCONTROLFIELD_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGPARAMETER TBLROUTINGPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGPARAMETER"
    ADD CONSTRAINT "TBLROUTINGPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGPRODUCTLOCATION TBLROUTINGPRODUCTLOCATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGPRODUCTLOCATION"
    ADD CONSTRAINT "TBLROUTINGPRODUCTLOCATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGRULE TBLROUTINGRULE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGRULE"
    ADD CONSTRAINT "TBLROUTINGRULE_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGTYPEOPERATION TBLROUTINGTYPEOPERATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGTYPEOPERATION"
    ADD CONSTRAINT "TBLROUTINGTYPEOPERATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLROUTINGTYPE TBLROUTINGTYPE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGTYPE"
    ADD CONSTRAINT "TBLROUTINGTYPE_pkey" PRIMARY KEY (id);


--
-- Name: TBLSCREENREPORTLINK TBLSCREENREPORTLINK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSCREENREPORTLINK"
    ADD CONSTRAINT "TBLSCREENREPORTLINK_pkey" PRIMARY KEY (id);


--
-- Name: TBLSEQUENCE TBLSEQUENCE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSEQUENCE"
    ADD CONSTRAINT "TBLSEQUENCE_pkey" PRIMARY KEY (id);


--
-- Name: TBLSEQUENTIALOPERATION TBLSEQUENTIALOPERATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSEQUENTIALOPERATION"
    ADD CONSTRAINT "TBLSEQUENTIALOPERATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLSHIFT TBLSHIFT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSHIFT"
    ADD CONSTRAINT "TBLSHIFT_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTATUS TBLSTATUS_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTATUS"
    ADD CONSTRAINT "TBLSTATUS_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTOCKCONTROLPARAMETER TBLSTOCKCONTROLPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCONTROLPARAMETER"
    ADD CONSTRAINT "TBLSTOCKCONTROLPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTOCKCOUNTLINE TBLSTOCKCOUNTLINE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCOUNTLINE"
    ADD CONSTRAINT "TBLSTOCKCOUNTLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTOCKCOUNT TBLSTOCKCOUNT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCOUNT"
    ADD CONSTRAINT "TBLSTOCKCOUNT_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTOCKLEDGER TBLSTOCKLEDGER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKLEDGER"
    ADD CONSTRAINT "TBLSTOCKLEDGER_pkey" PRIMARY KEY (id);


--
-- Name: TBLSTOCK TBLSTOCK_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_pkey" PRIMARY KEY (id);


--
-- Name: TBLTRIPBASEDCOLLECTION TBLTRIPBASEDCOLLECTION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLTRIPBASEDCOLLECTION"
    ADD CONSTRAINT "TBLTRIPBASEDCOLLECTION_pkey" PRIMARY KEY (id);


--
-- Name: TBLUNIT TBLUNIT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUNIT"
    ADD CONSTRAINT "TBLUNIT_pkey" PRIMARY KEY (id);


--
-- Name: TBLUSERAUTHORIZATION TBLUSERAUTHORIZATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERAUTHORIZATION"
    ADD CONSTRAINT "TBLUSERAUTHORIZATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLUSERCOLUMNAUTH TBLUSERCOLUMNAUTH_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERCOLUMNAUTH"
    ADD CONSTRAINT "TBLUSERCOLUMNAUTH_pkey" PRIMARY KEY (id);


--
-- Name: TBLUSERGROUPMEMBER TBLUSERGROUPMEMBER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUPMEMBER"
    ADD CONSTRAINT "TBLUSERGROUPMEMBER_pkey" PRIMARY KEY ("userId", "groupId");


--
-- Name: TBLUSERGROUP TBLUSERGROUP_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUP"
    ADD CONSTRAINT "TBLUSERGROUP_pkey" PRIMARY KEY (id);


--
-- Name: TBLUSERROLE TBLUSERROLE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERROLE"
    ADD CONSTRAINT "TBLUSERROLE_pkey" PRIMARY KEY ("userId", "roleId");


--
-- Name: TBLUSERSCREENRIGHT TBLUSERSCREENRIGHT_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERSCREENRIGHT"
    ADD CONSTRAINT "TBLUSERSCREENRIGHT_pkey" PRIMARY KEY (id);


--
-- Name: TBLUSER TBLUSER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSER"
    ADD CONSTRAINT "TBLUSER_pkey" PRIMARY KEY (id);


--
-- Name: TBLWAREHOUSEVEHICLE TBLWAREHOUSEVEHICLE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSEVEHICLE"
    ADD CONSTRAINT "TBLWAREHOUSEVEHICLE_pkey" PRIMARY KEY (id);


--
-- Name: TBLWAREHOUSE TBLWAREHOUSE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSE"
    ADD CONSTRAINT "TBLWAREHOUSE_pkey" PRIMARY KEY (id);


--
-- Name: TBLWORKORDERGENERALPARAMETER TBLWORKORDERGENERALPARAMETER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERGENERALPARAMETER"
    ADD CONSTRAINT "TBLWORKORDERGENERALPARAMETER_pkey" PRIMARY KEY (id);


--
-- Name: TBLWORKORDERLINE TBLWORKORDERLINE_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERLINE"
    ADD CONSTRAINT "TBLWORKORDERLINE_pkey" PRIMARY KEY (id);


--
-- Name: TBLWORKORDERREASON TBLWORKORDERREASON_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERREASON"
    ADD CONSTRAINT "TBLWORKORDERREASON_pkey" PRIMARY KEY (id);


--
-- Name: TBLWORKORDERREFERENCEOPERATION TBLWORKORDERREFERENCEOPERATION_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERREFERENCEOPERATION"
    ADD CONSTRAINT "TBLWORKORDERREFERENCEOPERATION_pkey" PRIMARY KEY (id);


--
-- Name: TBLWORKORDER TBLWORKORDER_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDER"
    ADD CONSTRAINT "TBLWORKORDER_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: TBLINVOICELINE_companyId_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX "TBLINVOICELINE_companyId_idx" ON finance."TBLINVOICELINE" USING btree ("companyId");


--
-- Name: TBLINVOICELINE_invoiceId_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX "TBLINVOICELINE_invoiceId_idx" ON finance."TBLINVOICELINE" USING btree ("invoiceId");


--
-- Name: TBLINVOICELINE_invoiceId_lineNo_key; Type: INDEX; Schema: finance; Owner: -
--

CREATE UNIQUE INDEX "TBLINVOICELINE_invoiceId_lineNo_key" ON finance."TBLINVOICELINE" USING btree ("invoiceId", "lineNo");


--
-- Name: TBLINVOICE_companyId_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX "TBLINVOICE_companyId_idx" ON finance."TBLINVOICE" USING btree ("companyId");


--
-- Name: TBLINVOICE_companyId_invoiceNo_key; Type: INDEX; Schema: finance; Owner: -
--

CREATE UNIQUE INDEX "TBLINVOICE_companyId_invoiceNo_key" ON finance."TBLINVOICE" USING btree ("companyId", "invoiceNo");


--
-- Name: TBLINVOICE_partnerId_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX "TBLINVOICE_partnerId_idx" ON finance."TBLINVOICE" USING btree ("partnerId");


--
-- Name: TBLINVOICE_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX "TBLINVOICE_status_idx" ON finance."TBLINVOICE" USING btree (status);


--
-- Name: TBLSHIPMENTSTOP_companyId_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLSHIPMENTSTOP_companyId_idx" ON logistics."TBLSHIPMENTSTOP" USING btree ("companyId");


--
-- Name: TBLSHIPMENTSTOP_shipmentId_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLSHIPMENTSTOP_shipmentId_idx" ON logistics."TBLSHIPMENTSTOP" USING btree ("shipmentId");


--
-- Name: TBLSHIPMENTSTOP_shipmentId_sequence_key; Type: INDEX; Schema: logistics; Owner: -
--

CREATE UNIQUE INDEX "TBLSHIPMENTSTOP_shipmentId_sequence_key" ON logistics."TBLSHIPMENTSTOP" USING btree ("shipmentId", sequence);


--
-- Name: TBLSHIPMENT_companyId_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLSHIPMENT_companyId_idx" ON logistics."TBLSHIPMENT" USING btree ("companyId");


--
-- Name: TBLSHIPMENT_companyId_shipmentNo_key; Type: INDEX; Schema: logistics; Owner: -
--

CREATE UNIQUE INDEX "TBLSHIPMENT_companyId_shipmentNo_key" ON logistics."TBLSHIPMENT" USING btree ("companyId", "shipmentNo");


--
-- Name: TBLSHIPMENT_status_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLSHIPMENT_status_idx" ON logistics."TBLSHIPMENT" USING btree (status);


--
-- Name: TBLSHIPMENT_vehicleId_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLSHIPMENT_vehicleId_idx" ON logistics."TBLSHIPMENT" USING btree ("vehicleId");


--
-- Name: TBLVEHICLE_companyId_idx; Type: INDEX; Schema: logistics; Owner: -
--

CREATE INDEX "TBLVEHICLE_companyId_idx" ON logistics."TBLVEHICLE" USING btree ("companyId");


--
-- Name: TBLVEHICLE_companyId_plateNo_key; Type: INDEX; Schema: logistics; Owner: -
--

CREATE UNIQUE INDEX "TBLVEHICLE_companyId_plateNo_key" ON logistics."TBLVEHICLE" USING btree ("companyId", "plateNo");


--
-- Name: TBLPURCHASEORDERLINE_companyId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDERLINE_companyId_idx" ON procurement."TBLPURCHASEORDERLINE" USING btree ("companyId");


--
-- Name: TBLPURCHASEORDERLINE_orderId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDERLINE_orderId_idx" ON procurement."TBLPURCHASEORDERLINE" USING btree ("orderId");


--
-- Name: TBLPURCHASEORDERLINE_orderId_lineNo_key; Type: INDEX; Schema: procurement; Owner: -
--

CREATE UNIQUE INDEX "TBLPURCHASEORDERLINE_orderId_lineNo_key" ON procurement."TBLPURCHASEORDERLINE" USING btree ("orderId", "lineNo");


--
-- Name: TBLPURCHASEORDERLINE_productId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDERLINE_productId_idx" ON procurement."TBLPURCHASEORDERLINE" USING btree ("productId");


--
-- Name: TBLPURCHASEORDER_companyId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDER_companyId_idx" ON procurement."TBLPURCHASEORDER" USING btree ("companyId");


--
-- Name: TBLPURCHASEORDER_companyId_orderNo_key; Type: INDEX; Schema: procurement; Owner: -
--

CREATE UNIQUE INDEX "TBLPURCHASEORDER_companyId_orderNo_key" ON procurement."TBLPURCHASEORDER" USING btree ("companyId", "orderNo");


--
-- Name: TBLPURCHASEORDER_status_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDER_status_idx" ON procurement."TBLPURCHASEORDER" USING btree (status);


--
-- Name: TBLPURCHASEORDER_supplierId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDER_supplierId_idx" ON procurement."TBLPURCHASEORDER" USING btree ("supplierId");


--
-- Name: TBLPURCHASEORDER_warehouseId_idx; Type: INDEX; Schema: procurement; Owner: -
--

CREATE INDEX "TBLPURCHASEORDER_warehouseId_idx" ON procurement."TBLPURCHASEORDER" USING btree ("warehouseId");


--
-- Name: TBLSALESALLOCATION_companyId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESALLOCATION_companyId_idx" ON sales."TBLSALESALLOCATION" USING btree ("companyId");


--
-- Name: TBLSALESALLOCATION_orderLineId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESALLOCATION_orderLineId_idx" ON sales."TBLSALESALLOCATION" USING btree ("orderLineId");


--
-- Name: TBLSALESALLOCATION_stockId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESALLOCATION_stockId_idx" ON sales."TBLSALESALLOCATION" USING btree ("stockId");


--
-- Name: TBLSALESORDERLINE_companyId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDERLINE_companyId_idx" ON sales."TBLSALESORDERLINE" USING btree ("companyId");


--
-- Name: TBLSALESORDERLINE_orderId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDERLINE_orderId_idx" ON sales."TBLSALESORDERLINE" USING btree ("orderId");


--
-- Name: TBLSALESORDERLINE_orderId_lineNo_key; Type: INDEX; Schema: sales; Owner: -
--

CREATE UNIQUE INDEX "TBLSALESORDERLINE_orderId_lineNo_key" ON sales."TBLSALESORDERLINE" USING btree ("orderId", "lineNo");


--
-- Name: TBLSALESORDERLINE_productId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDERLINE_productId_idx" ON sales."TBLSALESORDERLINE" USING btree ("productId");


--
-- Name: TBLSALESORDER_companyId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDER_companyId_idx" ON sales."TBLSALESORDER" USING btree ("companyId");


--
-- Name: TBLSALESORDER_companyId_orderNo_key; Type: INDEX; Schema: sales; Owner: -
--

CREATE UNIQUE INDEX "TBLSALESORDER_companyId_orderNo_key" ON sales."TBLSALESORDER" USING btree ("companyId", "orderNo");


--
-- Name: TBLSALESORDER_customerId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDER_customerId_idx" ON sales."TBLSALESORDER" USING btree ("customerId");


--
-- Name: TBLSALESORDER_status_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDER_status_idx" ON sales."TBLSALESORDER" USING btree (status);


--
-- Name: TBLSALESORDER_warehouseId_idx; Type: INDEX; Schema: sales; Owner: -
--

CREATE INDEX "TBLSALESORDER_warehouseId_idx" ON sales."TBLSALESORDER" USING btree ("warehouseId");


--
-- Name: TBLAREA_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLAREA_companyId_code_key" ON wms."TBLAREA" USING btree ("companyId", code);


--
-- Name: TBLAREA_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLAREA_companyId_idx" ON wms."TBLAREA" USING btree ("companyId");


--
-- Name: TBLAREA_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLAREA_facilityId_idx" ON wms."TBLAREA" USING btree ("facilityId");


--
-- Name: TBLAREA_warehouseId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLAREA_warehouseId_idx" ON wms."TBLAREA" USING btree ("warehouseId");


--
-- Name: TBLAUTOREFERENCEDOCUMENT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLAUTOREFERENCEDOCUMENT_companyId_idx" ON wms."TBLAUTOREFERENCEDOCUMENT" USING btree ("companyId");


--
-- Name: TBLBARCODETYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLBARCODETYPE_companyId_code_key" ON wms."TBLBARCODETYPE" USING btree ("companyId", code);


--
-- Name: TBLBARCODETYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLBARCODETYPE_companyId_idx" ON wms."TBLBARCODETYPE" USING btree ("companyId");


--
-- Name: TBLBUSINESSPARTNER_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLBUSINESSPARTNER_companyId_code_key" ON wms."TBLBUSINESSPARTNER" USING btree ("companyId", code);


--
-- Name: TBLBUSINESSPARTNER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLBUSINESSPARTNER_companyId_idx" ON wms."TBLBUSINESSPARTNER" USING btree ("companyId");


--
-- Name: TBLBUSINESSPARTNER_parentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLBUSINESSPARTNER_parentId_idx" ON wms."TBLBUSINESSPARTNER" USING btree ("parentId");


--
-- Name: TBLBUSINESSPARTNER_partnerGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLBUSINESSPARTNER_partnerGroupId_idx" ON wms."TBLBUSINESSPARTNER" USING btree ("partnerGroupId");


--
-- Name: TBLBUSINESSPARTNER_regionId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLBUSINESSPARTNER_regionId_idx" ON wms."TBLBUSINESSPARTNER" USING btree ("regionId");


--
-- Name: TBLCOMPANY_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLCOMPANY_code_key" ON wms."TBLCOMPANY" USING btree (code);


--
-- Name: TBLCONDITIONBREAKLOG_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCONDITIONBREAKLOG_companyId_idx" ON wms."TBLCONDITIONBREAKLOG" USING btree ("companyId");


--
-- Name: TBLCONDITIONBREAKLOG_documentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCONDITIONBREAKLOG_documentId_idx" ON wms."TBLCONDITIONBREAKLOG" USING btree ("documentId");


--
-- Name: TBLCONTROLCOUNTLINE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCONTROLCOUNTLINE_companyId_idx" ON wms."TBLCONTROLCOUNTLINE" USING btree ("companyId");


--
-- Name: TBLCONTROLCOUNTLINE_controlCountId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCONTROLCOUNTLINE_controlCountId_idx" ON wms."TBLCONTROLCOUNTLINE" USING btree ("controlCountId");


--
-- Name: TBLCONTROLCOUNT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCONTROLCOUNT_companyId_idx" ON wms."TBLCONTROLCOUNT" USING btree ("companyId");


--
-- Name: TBLCOUNTAPPROVALUSERGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTAPPROVALUSERGROUP_companyId_idx" ON wms."TBLCOUNTAPPROVALUSERGROUP" USING btree ("companyId");


--
-- Name: TBLCOUNTASSIGNMENT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTASSIGNMENT_companyId_idx" ON wms."TBLCOUNTASSIGNMENT" USING btree ("companyId");


--
-- Name: TBLCOUNTASSIGNMENT_stockCountId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTASSIGNMENT_stockCountId_idx" ON wms."TBLCOUNTASSIGNMENT" USING btree ("stockCountId");


--
-- Name: TBLCOUNTASSIGNMENT_userId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTASSIGNMENT_userId_idx" ON wms."TBLCOUNTASSIGNMENT" USING btree ("userId");


--
-- Name: TBLCOUNTCRITERIA_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTCRITERIA_companyId_idx" ON wms."TBLCOUNTCRITERIA" USING btree ("companyId");


--
-- Name: TBLCOUNTPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLCOUNTPARAMETER_companyId_idx" ON wms."TBLCOUNTPARAMETER" USING btree ("companyId");


--
-- Name: TBLDASHBOARDREPORT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDASHBOARDREPORT_companyId_idx" ON wms."TBLDASHBOARDREPORT" USING btree ("companyId");


--
-- Name: TBLDOCUMENTAPPROVALTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTAPPROVALTYPE_companyId_idx" ON wms."TBLDOCUMENTAPPROVALTYPE" USING btree ("companyId");


--
-- Name: TBLDOCUMENTASSIGNMENT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTASSIGNMENT_companyId_idx" ON wms."TBLDOCUMENTASSIGNMENT" USING btree ("companyId");


--
-- Name: TBLDOCUMENTASSIGNMENT_documentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTASSIGNMENT_documentId_idx" ON wms."TBLDOCUMENTASSIGNMENT" USING btree ("documentId");


--
-- Name: TBLDOCUMENTASSIGNMENT_userId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTASSIGNMENT_userId_idx" ON wms."TBLDOCUMENTASSIGNMENT" USING btree ("userId");


--
-- Name: TBLDOCUMENTLINESCOPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINESCOPE_companyId_idx" ON wms."TBLDOCUMENTLINESCOPE" USING btree ("companyId");


--
-- Name: TBLDOCUMENTLINESCOPE_documentLineId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINESCOPE_documentLineId_idx" ON wms."TBLDOCUMENTLINESCOPE" USING btree ("documentLineId");


--
-- Name: TBLDOCUMENTLINESCOPE_documentLineId_scopeNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLDOCUMENTLINESCOPE_documentLineId_scopeNo_key" ON wms."TBLDOCUMENTLINESCOPE" USING btree ("documentLineId", "scopeNo");


--
-- Name: TBLDOCUMENTLINE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINE_companyId_idx" ON wms."TBLDOCUMENTLINE" USING btree ("companyId");


--
-- Name: TBLDOCUMENTLINE_documentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINE_documentId_idx" ON wms."TBLDOCUMENTLINE" USING btree ("documentId");


--
-- Name: TBLDOCUMENTLINE_documentId_lineNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLDOCUMENTLINE_documentId_lineNo_key" ON wms."TBLDOCUMENTLINE" USING btree ("documentId", "lineNo");


--
-- Name: TBLDOCUMENTLINE_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINE_productId_idx" ON wms."TBLDOCUMENTLINE" USING btree ("productId");


--
-- Name: TBLDOCUMENTLINE_sourceLocationId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINE_sourceLocationId_idx" ON wms."TBLDOCUMENTLINE" USING btree ("sourceLocationId");


--
-- Name: TBLDOCUMENTLINE_targetLocationId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTLINE_targetLocationId_idx" ON wms."TBLDOCUMENTLINE" USING btree ("targetLocationId");


--
-- Name: TBLDOCUMENTPLANNINGPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTPLANNINGPARAMETER_companyId_idx" ON wms."TBLDOCUMENTPLANNINGPARAMETER" USING btree ("companyId");


--
-- Name: TBLDOCUMENTSTATUSACTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUSACTION_companyId_idx" ON wms."TBLDOCUMENTSTATUSACTION" USING btree ("companyId");


--
-- Name: TBLDOCUMENTSTATUSCRITERIA_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUSCRITERIA_companyId_idx" ON wms."TBLDOCUMENTSTATUSCRITERIA" USING btree ("companyId");


--
-- Name: TBLDOCUMENTSTATUSCRITERIA_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUSCRITERIA_operationTypeId_idx" ON wms."TBLDOCUMENTSTATUSCRITERIA" USING btree ("operationTypeId");


--
-- Name: TBLDOCUMENTSTATUSHISTORY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUSHISTORY_companyId_idx" ON wms."TBLDOCUMENTSTATUSHISTORY" USING btree ("companyId");


--
-- Name: TBLDOCUMENTSTATUSHISTORY_documentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUSHISTORY_documentId_idx" ON wms."TBLDOCUMENTSTATUSHISTORY" USING btree ("documentId");


--
-- Name: TBLDOCUMENTSTATUS_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLDOCUMENTSTATUS_companyId_code_key" ON wms."TBLDOCUMENTSTATUS" USING btree ("companyId", code);


--
-- Name: TBLDOCUMENTSTATUS_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENTSTATUS_companyId_idx" ON wms."TBLDOCUMENTSTATUS" USING btree ("companyId");


--
-- Name: TBLDOCUMENT_companyId_documentNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLDOCUMENT_companyId_documentNo_key" ON wms."TBLDOCUMENT" USING btree ("companyId", "documentNo");


--
-- Name: TBLDOCUMENT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENT_companyId_idx" ON wms."TBLDOCUMENT" USING btree ("companyId");


--
-- Name: TBLDOCUMENT_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENT_operationTypeId_idx" ON wms."TBLDOCUMENT" USING btree ("operationTypeId");


--
-- Name: TBLDOCUMENT_partnerId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENT_partnerId_idx" ON wms."TBLDOCUMENT" USING btree ("partnerId");


--
-- Name: TBLDOCUMENT_status_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENT_status_idx" ON wms."TBLDOCUMENT" USING btree (status);


--
-- Name: TBLDOCUMENT_warehouseId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLDOCUMENT_warehouseId_idx" ON wms."TBLDOCUMENT" USING btree ("warehouseId");


--
-- Name: TBLENTRYCONDITIONBREAKPASSWORD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONBREAKPASSWORD_companyId_idx" ON wms."TBLENTRYCONDITIONBREAKPASSWORD" USING btree ("companyId");


--
-- Name: TBLENTRYCONDITIONBREAKREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONBREAKREASON_companyId_idx" ON wms."TBLENTRYCONDITIONBREAKREASON" USING btree ("companyId");


--
-- Name: TBLENTRYCONDITIONPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONPARAMETER_companyId_idx" ON wms."TBLENTRYCONDITIONPARAMETER" USING btree ("companyId");


--
-- Name: TBLENTRYCONDITIONPARAMETER_entryConditionTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONPARAMETER_entryConditionTypeId_idx" ON wms."TBLENTRYCONDITIONPARAMETER" USING btree ("entryConditionTypeId");


--
-- Name: TBLENTRYCONDITIONTYPEOPERATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONTYPEOPERATION_companyId_idx" ON wms."TBLENTRYCONDITIONTYPEOPERATION" USING btree ("companyId");


--
-- Name: TBLENTRYCONDITIONTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLENTRYCONDITIONTYPE_companyId_code_key" ON wms."TBLENTRYCONDITIONTYPE" USING btree ("companyId", code);


--
-- Name: TBLENTRYCONDITIONTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLENTRYCONDITIONTYPE_companyId_idx" ON wms."TBLENTRYCONDITIONTYPE" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONBREAKPASSWORD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONBREAKPASSWORD_companyId_idx" ON wms."TBLEXITCONDITIONBREAKPASSWORD" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONBREAKREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONBREAKREASON_companyId_idx" ON wms."TBLEXITCONDITIONBREAKREASON" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONCONTROLFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONCONTROLFIELD_companyId_idx" ON wms."TBLEXITCONDITIONCONTROLFIELD" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONPARAMETER_companyId_idx" ON wms."TBLEXITCONDITIONPARAMETER" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONPARAMETER_exitConditionTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONPARAMETER_exitConditionTypeId_idx" ON wms."TBLEXITCONDITIONPARAMETER" USING btree ("exitConditionTypeId");


--
-- Name: TBLEXITCONDITIONTYPEOPERATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONTYPEOPERATION_companyId_idx" ON wms."TBLEXITCONDITIONTYPEOPERATION" USING btree ("companyId");


--
-- Name: TBLEXITCONDITIONTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLEXITCONDITIONTYPE_companyId_code_key" ON wms."TBLEXITCONDITIONTYPE" USING btree ("companyId", code);


--
-- Name: TBLEXITCONDITIONTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXITCONDITIONTYPE_companyId_idx" ON wms."TBLEXITCONDITIONTYPE" USING btree ("companyId");


--
-- Name: TBLEXTRAFIELDOPTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXTRAFIELDOPTION_companyId_idx" ON wms."TBLEXTRAFIELDOPTION" USING btree ("companyId");


--
-- Name: TBLEXTRAFIELDOPTION_extraFieldId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXTRAFIELDOPTION_extraFieldId_idx" ON wms."TBLEXTRAFIELDOPTION" USING btree ("extraFieldId");


--
-- Name: TBLEXTRAFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXTRAFIELD_companyId_idx" ON wms."TBLEXTRAFIELD" USING btree ("companyId");


--
-- Name: TBLEXTRAFIELD_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLEXTRAFIELD_facilityId_idx" ON wms."TBLEXTRAFIELD" USING btree ("facilityId");


--
-- Name: TBLFACILITY_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLFACILITY_companyId_code_key" ON wms."TBLFACILITY" USING btree ("companyId", code);


--
-- Name: TBLFACILITY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLFACILITY_companyId_idx" ON wms."TBLFACILITY" USING btree ("companyId");


--
-- Name: TBLHANDHELDMENUGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLHANDHELDMENUGROUP_companyId_code_key" ON wms."TBLHANDHELDMENUGROUP" USING btree ("companyId", code);


--
-- Name: TBLHANDHELDMENUGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLHANDHELDMENUGROUP_companyId_idx" ON wms."TBLHANDHELDMENUGROUP" USING btree ("companyId");


--
-- Name: TBLHANDHELDMENUITEM_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLHANDHELDMENUITEM_companyId_code_key" ON wms."TBLHANDHELDMENUITEM" USING btree ("companyId", code);


--
-- Name: TBLHANDHELDMENUITEM_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLHANDHELDMENUITEM_companyId_idx" ON wms."TBLHANDHELDMENUITEM" USING btree ("companyId");


--
-- Name: TBLHANDHELDMENUITEM_groupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLHANDHELDMENUITEM_groupId_idx" ON wms."TBLHANDHELDMENUITEM" USING btree ("groupId");


--
-- Name: TBLINTEGRATIONLOG_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLINTEGRATIONLOG_companyId_idx" ON wms."TBLINTEGRATIONLOG" USING btree ("companyId");


--
-- Name: TBLINTEGRATIONLOG_direction_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLINTEGRATIONLOG_direction_idx" ON wms."TBLINTEGRATIONLOG" USING btree (direction);


--
-- Name: TBLINVENTORYRULE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLINVENTORYRULE_companyId_idx" ON wms."TBLINVENTORYRULE" USING btree ("companyId");


--
-- Name: TBLINVENTORYRULE_companyId_productId_warehouseId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLINVENTORYRULE_companyId_productId_warehouseId_key" ON wms."TBLINVENTORYRULE" USING btree ("companyId", "productId", "warehouseId");


--
-- Name: TBLINVENTORYRULE_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLINVENTORYRULE_productId_idx" ON wms."TBLINVENTORYRULE" USING btree ("productId");


--
-- Name: TBLINVENTORYRULE_warehouseId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLINVENTORYRULE_warehouseId_idx" ON wms."TBLINVENTORYRULE" USING btree ("warehouseId");


--
-- Name: TBLLABELTEMPLATEITEM_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTEMPLATEITEM_companyId_idx" ON wms."TBLLABELTEMPLATEITEM" USING btree ("companyId");


--
-- Name: TBLLABELTEMPLATEITEM_labelTemplateId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTEMPLATEITEM_labelTemplateId_idx" ON wms."TBLLABELTEMPLATEITEM" USING btree ("labelTemplateId");


--
-- Name: TBLLABELTEMPLATEQUERY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTEMPLATEQUERY_companyId_idx" ON wms."TBLLABELTEMPLATEQUERY" USING btree ("companyId");


--
-- Name: TBLLABELTEMPLATEQUERY_labelTemplateId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTEMPLATEQUERY_labelTemplateId_idx" ON wms."TBLLABELTEMPLATEQUERY" USING btree ("labelTemplateId");


--
-- Name: TBLLABELTEMPLATE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTEMPLATE_companyId_idx" ON wms."TBLLABELTEMPLATE" USING btree ("companyId");


--
-- Name: TBLLABELTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLLABELTYPE_companyId_code_key" ON wms."TBLLABELTYPE" USING btree ("companyId", code);


--
-- Name: TBLLABELTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLABELTYPE_companyId_idx" ON wms."TBLLABELTYPE" USING btree ("companyId");


--
-- Name: TBLLANGUAGE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLANGUAGE_companyId_idx" ON wms."TBLLANGUAGE" USING btree ("companyId");


--
-- Name: TBLLOCATIONCAPACITY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATIONCAPACITY_companyId_idx" ON wms."TBLLOCATIONCAPACITY" USING btree ("companyId");


--
-- Name: TBLLOCATIONCAPACITY_locationLinkCode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATIONCAPACITY_locationLinkCode_idx" ON wms."TBLLOCATIONCAPACITY" USING btree ("locationLinkCode");


--
-- Name: TBLLOCATIONGROUPLINK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATIONGROUPLINK_companyId_idx" ON wms."TBLLOCATIONGROUPLINK" USING btree ("companyId");


--
-- Name: TBLLOCATIONGROUPLINK_locationGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATIONGROUPLINK_locationGroupId_idx" ON wms."TBLLOCATIONGROUPLINK" USING btree ("locationGroupId");


--
-- Name: TBLLOCATIONGROUPLINK_locationId_locationGroupId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLLOCATIONGROUPLINK_locationId_locationGroupId_key" ON wms."TBLLOCATIONGROUPLINK" USING btree ("locationId", "locationGroupId");


--
-- Name: TBLLOCATIONGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLLOCATIONGROUP_companyId_code_key" ON wms."TBLLOCATIONGROUP" USING btree ("companyId", code);


--
-- Name: TBLLOCATIONGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATIONGROUP_companyId_idx" ON wms."TBLLOCATIONGROUP" USING btree ("companyId");


--
-- Name: TBLLOCATION_areaId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_areaId_idx" ON wms."TBLLOCATION" USING btree ("areaId");


--
-- Name: TBLLOCATION_barcode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_barcode_idx" ON wms."TBLLOCATION" USING btree (barcode);


--
-- Name: TBLLOCATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_companyId_idx" ON wms."TBLLOCATION" USING btree ("companyId");


--
-- Name: TBLLOCATION_companyId_warehouseId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLLOCATION_companyId_warehouseId_code_key" ON wms."TBLLOCATION" USING btree ("companyId", "warehouseId", code);


--
-- Name: TBLLOCATION_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_facilityId_idx" ON wms."TBLLOCATION" USING btree ("facilityId");


--
-- Name: TBLLOCATION_parentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_parentId_idx" ON wms."TBLLOCATION" USING btree ("parentId");


--
-- Name: TBLLOCATION_warehouseId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLLOCATION_warehouseId_idx" ON wms."TBLLOCATION" USING btree ("warehouseId");


--
-- Name: TBLMENUGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLMENUGROUP_companyId_idx" ON wms."TBLMENUGROUP" USING btree ("companyId");


--
-- Name: TBLOPERATIONGROUPLINK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONGROUPLINK_companyId_idx" ON wms."TBLOPERATIONGROUPLINK" USING btree ("companyId");


--
-- Name: TBLOPERATIONGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLOPERATIONGROUP_companyId_code_key" ON wms."TBLOPERATIONGROUP" USING btree ("companyId", code);


--
-- Name: TBLOPERATIONGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONGROUP_companyId_idx" ON wms."TBLOPERATIONGROUP" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPEBULKACTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEBULKACTION_companyId_idx" ON wms."TBLOPERATIONTYPEBULKACTION" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPECONVERSION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPECONVERSION_companyId_idx" ON wms."TBLOPERATIONTYPECONVERSION" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEEXTRAFIELD_companyId_idx" ON wms."TBLOPERATIONTYPEEXTRAFIELD" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPEEXTRAFIELD_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEEXTRAFIELD_operationTypeId_idx" ON wms."TBLOPERATIONTYPEEXTRAFIELD" USING btree ("operationTypeId");


--
-- Name: TBLOPERATIONTYPEFORBIDDENPRODUCT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEFORBIDDENPRODUCT_companyId_idx" ON wms."TBLOPERATIONTYPEFORBIDDENPRODUCT" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPELOCATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPELOCATION_companyId_idx" ON wms."TBLOPERATIONTYPELOCATION" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPELOCATION_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPELOCATION_operationTypeId_idx" ON wms."TBLOPERATIONTYPELOCATION" USING btree ("operationTypeId");


--
-- Name: TBLOPERATIONTYPEPALLETTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEPALLETTYPE_companyId_idx" ON wms."TBLOPERATIONTYPEPALLETTYPE" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPEPALLETTYPE_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEPALLETTYPE_operationTypeId_idx" ON wms."TBLOPERATIONTYPEPALLETTYPE" USING btree ("operationTypeId");


--
-- Name: TBLOPERATIONTYPEREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEREASON_companyId_idx" ON wms."TBLOPERATIONTYPEREASON" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPEREASON_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPEREASON_operationTypeId_idx" ON wms."TBLOPERATIONTYPEREASON" USING btree ("operationTypeId");


--
-- Name: TBLOPERATIONTYPESTATUS_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPESTATUS_companyId_idx" ON wms."TBLOPERATIONTYPESTATUS" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPESTATUS_operationTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPESTATUS_operationTypeId_idx" ON wms."TBLOPERATIONTYPESTATUS" USING btree ("operationTypeId");


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPETOLERANCEDETAIL_companyId_idx" ON wms."TBLOPERATIONTYPETOLERANCEDETAIL" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL_toleranceId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPETOLERANCEDETAIL_toleranceId_idx" ON wms."TBLOPERATIONTYPETOLERANCEDETAIL" USING btree ("toleranceId");


--
-- Name: TBLOPERATIONTYPETOLERANCE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPETOLERANCE_companyId_idx" ON wms."TBLOPERATIONTYPETOLERANCE" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLOPERATIONTYPE_companyId_code_key" ON wms."TBLOPERATIONTYPE" USING btree ("companyId", code);


--
-- Name: TBLOPERATIONTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPE_companyId_idx" ON wms."TBLOPERATIONTYPE" USING btree ("companyId");


--
-- Name: TBLOPERATIONTYPE_operationGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPE_operationGroupId_idx" ON wms."TBLOPERATIONTYPE" USING btree ("operationGroupId");


--
-- Name: TBLOPERATIONTYPE_sequenceId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLOPERATIONTYPE_sequenceId_idx" ON wms."TBLOPERATIONTYPE" USING btree ("sequenceId");


--
-- Name: TBLPALLETHISTORY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETHISTORY_companyId_idx" ON wms."TBLPALLETHISTORY" USING btree ("companyId");


--
-- Name: TBLPALLETHISTORY_palletId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETHISTORY_palletId_idx" ON wms."TBLPALLETHISTORY" USING btree ("palletId");


--
-- Name: TBLPALLETNOTIFICATIONLINE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETNOTIFICATIONLINE_companyId_idx" ON wms."TBLPALLETNOTIFICATIONLINE" USING btree ("companyId");


--
-- Name: TBLPALLETNOTIFICATIONLINE_notificationId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETNOTIFICATIONLINE_notificationId_idx" ON wms."TBLPALLETNOTIFICATIONLINE" USING btree ("notificationId");


--
-- Name: TBLPALLETNOTIFICATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETNOTIFICATION_companyId_idx" ON wms."TBLPALLETNOTIFICATION" USING btree ("companyId");


--
-- Name: TBLPALLETTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPALLETTYPE_companyId_code_key" ON wms."TBLPALLETTYPE" USING btree ("companyId", code);


--
-- Name: TBLPALLETTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETTYPE_companyId_idx" ON wms."TBLPALLETTYPE" USING btree ("companyId");


--
-- Name: TBLPALLETTYPE_sequenceId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLETTYPE_sequenceId_idx" ON wms."TBLPALLETTYPE" USING btree ("sequenceId");


--
-- Name: TBLPALLET_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLET_companyId_idx" ON wms."TBLPALLET" USING btree ("companyId");


--
-- Name: TBLPALLET_companyId_palletNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPALLET_companyId_palletNo_key" ON wms."TBLPALLET" USING btree ("companyId", "palletNo");


--
-- Name: TBLPALLET_palletTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLET_palletTypeId_idx" ON wms."TBLPALLET" USING btree ("palletTypeId");


--
-- Name: TBLPALLET_parentPalletId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPALLET_parentPalletId_idx" ON wms."TBLPALLET" USING btree ("parentPalletId");


--
-- Name: TBLPARAMETER_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARAMETER_companyId_code_key" ON wms."TBLPARAMETER" USING btree ("companyId", code);


--
-- Name: TBLPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARAMETER_companyId_idx" ON wms."TBLPARAMETER" USING btree ("companyId");


--
-- Name: TBLPARTNERACCEPTANCETIME_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNERACCEPTANCETIME_companyId_idx" ON wms."TBLPARTNERACCEPTANCETIME" USING btree ("companyId");


--
-- Name: TBLPARTNERACCEPTANCETIME_partnerId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNERACCEPTANCETIME_partnerId_idx" ON wms."TBLPARTNERACCEPTANCETIME" USING btree ("partnerId");


--
-- Name: TBLPARTNEREXTRAFIELDDEF_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNEREXTRAFIELDDEF_companyId_code_key" ON wms."TBLPARTNEREXTRAFIELDDEF" USING btree ("companyId", code);


--
-- Name: TBLPARTNEREXTRAFIELDDEF_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAFIELDDEF_companyId_idx" ON wms."TBLPARTNEREXTRAFIELDDEF" USING btree ("companyId");


--
-- Name: TBLPARTNEREXTRAFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAFIELD_companyId_idx" ON wms."TBLPARTNEREXTRAFIELD" USING btree ("companyId");


--
-- Name: TBLPARTNEREXTRAFIELD_fieldDefId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAFIELD_fieldDefId_idx" ON wms."TBLPARTNEREXTRAFIELD" USING btree ("fieldDefId");


--
-- Name: TBLPARTNEREXTRAFIELD_partnerId_fieldDefId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNEREXTRAFIELD_partnerId_fieldDefId_key" ON wms."TBLPARTNEREXTRAFIELD" USING btree ("partnerId", "fieldDefId");


--
-- Name: TBLPARTNEREXTRAFIELD_partnerId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAFIELD_partnerId_idx" ON wms."TBLPARTNEREXTRAFIELD" USING btree ("partnerId");


--
-- Name: TBLPARTNEREXTRAGROUPLINK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAGROUPLINK_companyId_idx" ON wms."TBLPARTNEREXTRAGROUPLINK" USING btree ("companyId");


--
-- Name: TBLPARTNEREXTRAGROUPLINK_extraGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAGROUPLINK_extraGroupId_idx" ON wms."TBLPARTNEREXTRAGROUPLINK" USING btree ("extraGroupId");


--
-- Name: TBLPARTNEREXTRAGROUPLINK_partnerId_extraGroupId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNEREXTRAGROUPLINK_partnerId_extraGroupId_key" ON wms."TBLPARTNEREXTRAGROUPLINK" USING btree ("partnerId", "extraGroupId");


--
-- Name: TBLPARTNEREXTRAGROUPLINK_partnerId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAGROUPLINK_partnerId_idx" ON wms."TBLPARTNEREXTRAGROUPLINK" USING btree ("partnerId");


--
-- Name: TBLPARTNEREXTRAGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNEREXTRAGROUP_companyId_code_key" ON wms."TBLPARTNEREXTRAGROUP" USING btree ("companyId", code);


--
-- Name: TBLPARTNEREXTRAGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEREXTRAGROUP_companyId_idx" ON wms."TBLPARTNEREXTRAGROUP" USING btree ("companyId");


--
-- Name: TBLPARTNERFACILITY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNERFACILITY_companyId_idx" ON wms."TBLPARTNERFACILITY" USING btree ("companyId");


--
-- Name: TBLPARTNERFACILITY_partnerId_facilityId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNERFACILITY_partnerId_facilityId_key" ON wms."TBLPARTNERFACILITY" USING btree ("partnerId", "facilityId");


--
-- Name: TBLPARTNERFACILITY_partnerId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNERFACILITY_partnerId_idx" ON wms."TBLPARTNERFACILITY" USING btree ("partnerId");


--
-- Name: TBLPARTNERGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNERGROUP_companyId_code_key" ON wms."TBLPARTNERGROUP" USING btree ("companyId", code);


--
-- Name: TBLPARTNERGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNERGROUP_companyId_idx" ON wms."TBLPARTNERGROUP" USING btree ("companyId");


--
-- Name: TBLPARTNEROPTIMIZATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPARTNEROPTIMIZATION_companyId_idx" ON wms."TBLPARTNEROPTIMIZATION" USING btree ("companyId");


--
-- Name: TBLPARTNEROPTIMIZATION_partnerId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPARTNEROPTIMIZATION_partnerId_key" ON wms."TBLPARTNEROPTIMIZATION" USING btree ("partnerId");


--
-- Name: TBLPICKORDERPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPICKORDERPARAMETER_companyId_idx" ON wms."TBLPICKORDERPARAMETER" USING btree ("companyId");


--
-- Name: TBLPRINTER_companyId_facilityId_name_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRINTER_companyId_facilityId_name_key" ON wms."TBLPRINTER" USING btree ("companyId", "facilityId", name);


--
-- Name: TBLPRINTER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRINTER_companyId_idx" ON wms."TBLPRINTER" USING btree ("companyId");


--
-- Name: TBLPRINTER_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRINTER_facilityId_idx" ON wms."TBLPRINTER" USING btree ("facilityId");


--
-- Name: TBLPRODUCTADDITIONALGROUPLINK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTADDITIONALGROUPLINK_companyId_idx" ON wms."TBLPRODUCTADDITIONALGROUPLINK" USING btree ("companyId");


--
-- Name: TBLPRODUCTBASEDCOLLECTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTBASEDCOLLECTION_companyId_idx" ON wms."TBLPRODUCTBASEDCOLLECTION" USING btree ("companyId");


--
-- Name: TBLPRODUCTDETAILTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTDETAILTYPE_companyId_code_key" ON wms."TBLPRODUCTDETAILTYPE" USING btree ("companyId", code);


--
-- Name: TBLPRODUCTDETAILTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTDETAILTYPE_companyId_idx" ON wms."TBLPRODUCTDETAILTYPE" USING btree ("companyId");


--
-- Name: TBLPRODUCTFACILITY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTFACILITY_companyId_idx" ON wms."TBLPRODUCTFACILITY" USING btree ("companyId");


--
-- Name: TBLPRODUCTFACILITY_productId_facilityId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTFACILITY_productId_facilityId_key" ON wms."TBLPRODUCTFACILITY" USING btree ("productId", "facilityId");


--
-- Name: TBLPRODUCTFACILITY_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTFACILITY_productId_idx" ON wms."TBLPRODUCTFACILITY" USING btree ("productId");


--
-- Name: TBLPRODUCTGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTGROUP_companyId_code_key" ON wms."TBLPRODUCTGROUP" USING btree ("companyId", code);


--
-- Name: TBLPRODUCTGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTGROUP_companyId_idx" ON wms."TBLPRODUCTGROUP" USING btree ("companyId");


--
-- Name: TBLPRODUCTGROUP_parentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTGROUP_parentId_idx" ON wms."TBLPRODUCTGROUP" USING btree ("parentId");


--
-- Name: TBLPRODUCTSUBGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTSUBGROUP_companyId_code_key" ON wms."TBLPRODUCTSUBGROUP" USING btree ("companyId", code);


--
-- Name: TBLPRODUCTSUBGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTSUBGROUP_companyId_idx" ON wms."TBLPRODUCTSUBGROUP" USING btree ("companyId");


--
-- Name: TBLPRODUCTSUBSTITUTE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTSUBSTITUTE_companyId_idx" ON wms."TBLPRODUCTSUBSTITUTE" USING btree ("companyId");


--
-- Name: TBLPRODUCTSUBSTITUTE_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTSUBSTITUTE_productId_idx" ON wms."TBLPRODUCTSUBSTITUTE" USING btree ("productId");


--
-- Name: TBLPRODUCTSUBSTITUTE_productId_substituteProductId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTSUBSTITUTE_productId_substituteProductId_key" ON wms."TBLPRODUCTSUBSTITUTE" USING btree ("productId", "substituteProductId");


--
-- Name: TBLPRODUCTSUBSTITUTE_substituteProductId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTSUBSTITUTE_substituteProductId_idx" ON wms."TBLPRODUCTSUBSTITUTE" USING btree ("substituteProductId");


--
-- Name: TBLPRODUCTTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTTYPE_companyId_code_key" ON wms."TBLPRODUCTTYPE" USING btree ("companyId", code);


--
-- Name: TBLPRODUCTTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTTYPE_companyId_idx" ON wms."TBLPRODUCTTYPE" USING btree ("companyId");


--
-- Name: TBLPRODUCTUNITBARCODE_barcode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNITBARCODE_barcode_idx" ON wms."TBLPRODUCTUNITBARCODE" USING btree (barcode);


--
-- Name: TBLPRODUCTUNITBARCODE_companyId_barcode_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTUNITBARCODE_companyId_barcode_key" ON wms."TBLPRODUCTUNITBARCODE" USING btree ("companyId", barcode);


--
-- Name: TBLPRODUCTUNITBARCODE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNITBARCODE_companyId_idx" ON wms."TBLPRODUCTUNITBARCODE" USING btree ("companyId");


--
-- Name: TBLPRODUCTUNITBARCODE_productUnitId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNITBARCODE_productUnitId_idx" ON wms."TBLPRODUCTUNITBARCODE" USING btree ("productUnitId");


--
-- Name: TBLPRODUCTUNIT_barcode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNIT_barcode_idx" ON wms."TBLPRODUCTUNIT" USING btree (barcode);


--
-- Name: TBLPRODUCTUNIT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNIT_companyId_idx" ON wms."TBLPRODUCTUNIT" USING btree ("companyId");


--
-- Name: TBLPRODUCTUNIT_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNIT_productId_idx" ON wms."TBLPRODUCTUNIT" USING btree ("productId");


--
-- Name: TBLPRODUCTUNIT_productId_unitId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCTUNIT_productId_unitId_key" ON wms."TBLPRODUCTUNIT" USING btree ("productId", "unitId");


--
-- Name: TBLPRODUCTUNIT_unitId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCTUNIT_unitId_idx" ON wms."TBLPRODUCTUNIT" USING btree ("unitId");


--
-- Name: TBLPRODUCT_barcode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_barcode_idx" ON wms."TBLPRODUCT" USING btree (barcode);


--
-- Name: TBLPRODUCT_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLPRODUCT_companyId_code_key" ON wms."TBLPRODUCT" USING btree ("companyId", code);


--
-- Name: TBLPRODUCT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_companyId_idx" ON wms."TBLPRODUCT" USING btree ("companyId");


--
-- Name: TBLPRODUCT_detailTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_detailTypeId_idx" ON wms."TBLPRODUCT" USING btree ("detailTypeId");


--
-- Name: TBLPRODUCT_productGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_productGroupId_idx" ON wms."TBLPRODUCT" USING btree ("productGroupId");


--
-- Name: TBLPRODUCT_productSubGroupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_productSubGroupId_idx" ON wms."TBLPRODUCT" USING btree ("productSubGroupId");


--
-- Name: TBLPRODUCT_productTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_productTypeId_idx" ON wms."TBLPRODUCT" USING btree ("productTypeId");


--
-- Name: TBLPRODUCT_unitId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLPRODUCT_unitId_idx" ON wms."TBLPRODUCT" USING btree ("unitId");


--
-- Name: TBLQUALITYINSPECTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLQUALITYINSPECTION_companyId_idx" ON wms."TBLQUALITYINSPECTION" USING btree ("companyId");


--
-- Name: TBLQUALITYINSPECTION_companyId_inspectionNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLQUALITYINSPECTION_companyId_inspectionNo_key" ON wms."TBLQUALITYINSPECTION" USING btree ("companyId", "inspectionNo");


--
-- Name: TBLQUALITYINSPECTION_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLQUALITYINSPECTION_productId_idx" ON wms."TBLQUALITYINSPECTION" USING btree ("productId");


--
-- Name: TBLQUALITYINSPECTION_result_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLQUALITYINSPECTION_result_idx" ON wms."TBLQUALITYINSPECTION" USING btree (result);


--
-- Name: TBLRACKFEEDPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLRACKFEEDPARAMETER_companyId_idx" ON wms."TBLRACKFEEDPARAMETER" USING btree ("companyId");


--
-- Name: TBLREASONCATEGORY_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREASONCATEGORY_companyId_idx" ON wms."TBLREASONCATEGORY" USING btree ("companyId");


--
-- Name: TBLREASON_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLREASON_companyId_code_key" ON wms."TBLREASON" USING btree ("companyId", code);


--
-- Name: TBLREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREASON_companyId_idx" ON wms."TBLREASON" USING btree ("companyId");


--
-- Name: TBLREASON_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREASON_facilityId_idx" ON wms."TBLREASON" USING btree ("facilityId");


--
-- Name: TBLREGION_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLREGION_companyId_code_key" ON wms."TBLREGION" USING btree ("companyId", code);


--
-- Name: TBLREGION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREGION_companyId_idx" ON wms."TBLREGION" USING btree ("companyId");


--
-- Name: TBLREGION_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREGION_facilityId_idx" ON wms."TBLREGION" USING btree ("facilityId");


--
-- Name: TBLREPORTCRITERIA_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREPORTCRITERIA_companyId_idx" ON wms."TBLREPORTCRITERIA" USING btree ("companyId");


--
-- Name: TBLREPORTCRITERIA_reportId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREPORTCRITERIA_reportId_idx" ON wms."TBLREPORTCRITERIA" USING btree ("reportId");


--
-- Name: TBLREPORTDEF_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLREPORTDEF_companyId_code_key" ON wms."TBLREPORTDEF" USING btree ("companyId", code);


--
-- Name: TBLREPORTDEF_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREPORTDEF_companyId_idx" ON wms."TBLREPORTDEF" USING btree ("companyId");


--
-- Name: TBLREPORTFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREPORTFIELD_companyId_idx" ON wms."TBLREPORTFIELD" USING btree ("companyId");


--
-- Name: TBLREPORTFIELD_reportId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLREPORTFIELD_reportId_idx" ON wms."TBLREPORTFIELD" USING btree ("reportId");


--
-- Name: TBLROLE_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLROLE_code_key" ON wms."TBLROLE" USING btree (code);


--
-- Name: TBLROUTINGBREAKPASSWORD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGBREAKPASSWORD_companyId_idx" ON wms."TBLROUTINGBREAKPASSWORD" USING btree ("companyId");


--
-- Name: TBLROUTINGBREAKREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGBREAKREASON_companyId_idx" ON wms."TBLROUTINGBREAKREASON" USING btree ("companyId");


--
-- Name: TBLROUTINGCONTROLFIELD_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGCONTROLFIELD_companyId_idx" ON wms."TBLROUTINGCONTROLFIELD" USING btree ("companyId");


--
-- Name: TBLROUTINGPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGPARAMETER_companyId_idx" ON wms."TBLROUTINGPARAMETER" USING btree ("companyId");


--
-- Name: TBLROUTINGPARAMETER_routingTypeId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGPARAMETER_routingTypeId_idx" ON wms."TBLROUTINGPARAMETER" USING btree ("routingTypeId");


--
-- Name: TBLROUTINGPRODUCTLOCATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGPRODUCTLOCATION_companyId_idx" ON wms."TBLROUTINGPRODUCTLOCATION" USING btree ("companyId");


--
-- Name: TBLROUTINGRULE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGRULE_companyId_idx" ON wms."TBLROUTINGRULE" USING btree ("companyId");


--
-- Name: TBLROUTINGRULE_materialLinkCode_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGRULE_materialLinkCode_idx" ON wms."TBLROUTINGRULE" USING btree ("materialLinkCode");


--
-- Name: TBLROUTINGTYPEOPERATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGTYPEOPERATION_companyId_idx" ON wms."TBLROUTINGTYPEOPERATION" USING btree ("companyId");


--
-- Name: TBLROUTINGTYPE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLROUTINGTYPE_companyId_code_key" ON wms."TBLROUTINGTYPE" USING btree ("companyId", code);


--
-- Name: TBLROUTINGTYPE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLROUTINGTYPE_companyId_idx" ON wms."TBLROUTINGTYPE" USING btree ("companyId");


--
-- Name: TBLSCREENREPORTLINK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSCREENREPORTLINK_companyId_idx" ON wms."TBLSCREENREPORTLINK" USING btree ("companyId");


--
-- Name: TBLSEQUENCE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLSEQUENCE_companyId_code_key" ON wms."TBLSEQUENCE" USING btree ("companyId", code);


--
-- Name: TBLSEQUENCE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSEQUENCE_companyId_idx" ON wms."TBLSEQUENCE" USING btree ("companyId");


--
-- Name: TBLSEQUENTIALOPERATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSEQUENTIALOPERATION_companyId_idx" ON wms."TBLSEQUENTIALOPERATION" USING btree ("companyId");


--
-- Name: TBLSHIFT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSHIFT_companyId_idx" ON wms."TBLSHIFT" USING btree ("companyId");


--
-- Name: TBLSTATUS_companyId_facilityId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLSTATUS_companyId_facilityId_code_key" ON wms."TBLSTATUS" USING btree ("companyId", "facilityId", code);


--
-- Name: TBLSTATUS_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTATUS_companyId_idx" ON wms."TBLSTATUS" USING btree ("companyId");


--
-- Name: TBLSTATUS_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTATUS_facilityId_idx" ON wms."TBLSTATUS" USING btree ("facilityId");


--
-- Name: TBLSTOCKCONTROLPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCONTROLPARAMETER_companyId_idx" ON wms."TBLSTOCKCONTROLPARAMETER" USING btree ("companyId");


--
-- Name: TBLSTOCKCOUNTLINE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNTLINE_companyId_idx" ON wms."TBLSTOCKCOUNTLINE" USING btree ("companyId");


--
-- Name: TBLSTOCKCOUNTLINE_countId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNTLINE_countId_idx" ON wms."TBLSTOCKCOUNTLINE" USING btree ("countId");


--
-- Name: TBLSTOCKCOUNTLINE_countId_lineNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLSTOCKCOUNTLINE_countId_lineNo_key" ON wms."TBLSTOCKCOUNTLINE" USING btree ("countId", "lineNo");


--
-- Name: TBLSTOCKCOUNTLINE_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNTLINE_productId_idx" ON wms."TBLSTOCKCOUNTLINE" USING btree ("productId");


--
-- Name: TBLSTOCKCOUNT_companyId_countNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLSTOCKCOUNT_companyId_countNo_key" ON wms."TBLSTOCKCOUNT" USING btree ("companyId", "countNo");


--
-- Name: TBLSTOCKCOUNT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNT_companyId_idx" ON wms."TBLSTOCKCOUNT" USING btree ("companyId");


--
-- Name: TBLSTOCKCOUNT_status_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNT_status_idx" ON wms."TBLSTOCKCOUNT" USING btree (status);


--
-- Name: TBLSTOCKCOUNT_warehouseId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKCOUNT_warehouseId_idx" ON wms."TBLSTOCKCOUNT" USING btree ("warehouseId");


--
-- Name: TBLSTOCKLEDGER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKLEDGER_companyId_idx" ON wms."TBLSTOCKLEDGER" USING btree ("companyId");


--
-- Name: TBLSTOCKLEDGER_companyId_locationId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKLEDGER_companyId_locationId_idx" ON wms."TBLSTOCKLEDGER" USING btree ("companyId", "locationId");


--
-- Name: TBLSTOCKLEDGER_companyId_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKLEDGER_companyId_productId_idx" ON wms."TBLSTOCKLEDGER" USING btree ("companyId", "productId");


--
-- Name: TBLSTOCKLEDGER_createdAt_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKLEDGER_createdAt_idx" ON wms."TBLSTOCKLEDGER" USING btree ("createdAt");


--
-- Name: TBLSTOCKLEDGER_documentId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCKLEDGER_documentId_idx" ON wms."TBLSTOCKLEDGER" USING btree ("documentId");


--
-- Name: TBLSTOCK_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_companyId_idx" ON wms."TBLSTOCK" USING btree ("companyId");


--
-- Name: TBLSTOCK_companyId_locationId_productId_statusId_batchNo_se_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLSTOCK_companyId_locationId_productId_statusId_batchNo_se_key" ON wms."TBLSTOCK" USING btree ("companyId", "locationId", "productId", "statusId", "batchNo", "serialNo", "palletId", "customerId", "poNo", "poLine");


--
-- Name: TBLSTOCK_expiryDate_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_expiryDate_idx" ON wms."TBLSTOCK" USING btree ("expiryDate");


--
-- Name: TBLSTOCK_locationId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_locationId_idx" ON wms."TBLSTOCK" USING btree ("locationId");


--
-- Name: TBLSTOCK_palletId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_palletId_idx" ON wms."TBLSTOCK" USING btree ("palletId");


--
-- Name: TBLSTOCK_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_productId_idx" ON wms."TBLSTOCK" USING btree ("productId");


--
-- Name: TBLSTOCK_statusId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLSTOCK_statusId_idx" ON wms."TBLSTOCK" USING btree ("statusId");


--
-- Name: TBLTRIPBASEDCOLLECTION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLTRIPBASEDCOLLECTION_companyId_idx" ON wms."TBLTRIPBASEDCOLLECTION" USING btree ("companyId");


--
-- Name: TBLUNIT_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUNIT_companyId_code_key" ON wms."TBLUNIT" USING btree ("companyId", code);


--
-- Name: TBLUNIT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUNIT_companyId_idx" ON wms."TBLUNIT" USING btree ("companyId");


--
-- Name: TBLUSERAUTHORIZATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERAUTHORIZATION_companyId_idx" ON wms."TBLUSERAUTHORIZATION" USING btree ("companyId");


--
-- Name: TBLUSERAUTHORIZATION_groupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERAUTHORIZATION_groupId_idx" ON wms."TBLUSERAUTHORIZATION" USING btree ("groupId");


--
-- Name: TBLUSERAUTHORIZATION_groupId_scopeType_referenceCode_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERAUTHORIZATION_groupId_scopeType_referenceCode_key" ON wms."TBLUSERAUTHORIZATION" USING btree ("groupId", "scopeType", "referenceCode");


--
-- Name: TBLUSERAUTHORIZATION_groupId_scopeType_referenceId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERAUTHORIZATION_groupId_scopeType_referenceId_key" ON wms."TBLUSERAUTHORIZATION" USING btree ("groupId", "scopeType", "referenceId");


--
-- Name: TBLUSERAUTHORIZATION_userId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERAUTHORIZATION_userId_idx" ON wms."TBLUSERAUTHORIZATION" USING btree ("userId");


--
-- Name: TBLUSERAUTHORIZATION_userId_scopeType_referenceCode_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERAUTHORIZATION_userId_scopeType_referenceCode_key" ON wms."TBLUSERAUTHORIZATION" USING btree ("userId", "scopeType", "referenceCode");


--
-- Name: TBLUSERAUTHORIZATION_userId_scopeType_referenceId_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERAUTHORIZATION_userId_scopeType_referenceId_key" ON wms."TBLUSERAUTHORIZATION" USING btree ("userId", "scopeType", "referenceId");


--
-- Name: TBLUSERCOLUMNAUTH_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERCOLUMNAUTH_companyId_idx" ON wms."TBLUSERCOLUMNAUTH" USING btree ("companyId");


--
-- Name: TBLUSERCOLUMNAUTH_groupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERCOLUMNAUTH_groupId_idx" ON wms."TBLUSERCOLUMNAUTH" USING btree ("groupId");


--
-- Name: TBLUSERCOLUMNAUTH_groupId_resource_column_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERCOLUMNAUTH_groupId_resource_column_key" ON wms."TBLUSERCOLUMNAUTH" USING btree ("groupId", resource, "column");


--
-- Name: TBLUSERCOLUMNAUTH_userId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERCOLUMNAUTH_userId_idx" ON wms."TBLUSERCOLUMNAUTH" USING btree ("userId");


--
-- Name: TBLUSERCOLUMNAUTH_userId_resource_column_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERCOLUMNAUTH_userId_resource_column_key" ON wms."TBLUSERCOLUMNAUTH" USING btree ("userId", resource, "column");


--
-- Name: TBLUSERGROUPMEMBER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERGROUPMEMBER_companyId_idx" ON wms."TBLUSERGROUPMEMBER" USING btree ("companyId");


--
-- Name: TBLUSERGROUPMEMBER_groupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERGROUPMEMBER_groupId_idx" ON wms."TBLUSERGROUPMEMBER" USING btree ("groupId");


--
-- Name: TBLUSERGROUP_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERGROUP_companyId_code_key" ON wms."TBLUSERGROUP" USING btree ("companyId", code);


--
-- Name: TBLUSERGROUP_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERGROUP_companyId_idx" ON wms."TBLUSERGROUP" USING btree ("companyId");


--
-- Name: TBLUSERROLE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERROLE_companyId_idx" ON wms."TBLUSERROLE" USING btree ("companyId");


--
-- Name: TBLUSERROLE_roleId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERROLE_roleId_idx" ON wms."TBLUSERROLE" USING btree ("roleId");


--
-- Name: TBLUSERSCREENRIGHT_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERSCREENRIGHT_companyId_idx" ON wms."TBLUSERSCREENRIGHT" USING btree ("companyId");


--
-- Name: TBLUSERSCREENRIGHT_groupId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERSCREENRIGHT_groupId_idx" ON wms."TBLUSERSCREENRIGHT" USING btree ("groupId");


--
-- Name: TBLUSERSCREENRIGHT_groupId_resource_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERSCREENRIGHT_groupId_resource_key" ON wms."TBLUSERSCREENRIGHT" USING btree ("groupId", resource);


--
-- Name: TBLUSERSCREENRIGHT_userId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSERSCREENRIGHT_userId_idx" ON wms."TBLUSERSCREENRIGHT" USING btree ("userId");


--
-- Name: TBLUSERSCREENRIGHT_userId_resource_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSERSCREENRIGHT_userId_resource_key" ON wms."TBLUSERSCREENRIGHT" USING btree ("userId", resource);


--
-- Name: TBLUSER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLUSER_companyId_idx" ON wms."TBLUSER" USING btree ("companyId");


--
-- Name: TBLUSER_email_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSER_email_key" ON wms."TBLUSER" USING btree (email);


--
-- Name: TBLUSER_username_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLUSER_username_key" ON wms."TBLUSER" USING btree (username);


--
-- Name: TBLWAREHOUSEVEHICLE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWAREHOUSEVEHICLE_companyId_idx" ON wms."TBLWAREHOUSEVEHICLE" USING btree ("companyId");


--
-- Name: TBLWAREHOUSE_companyId_code_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLWAREHOUSE_companyId_code_key" ON wms."TBLWAREHOUSE" USING btree ("companyId", code);


--
-- Name: TBLWAREHOUSE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWAREHOUSE_companyId_idx" ON wms."TBLWAREHOUSE" USING btree ("companyId");


--
-- Name: TBLWAREHOUSE_facilityId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWAREHOUSE_facilityId_idx" ON wms."TBLWAREHOUSE" USING btree ("facilityId");


--
-- Name: TBLWORKORDERGENERALPARAMETER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERGENERALPARAMETER_companyId_idx" ON wms."TBLWORKORDERGENERALPARAMETER" USING btree ("companyId");


--
-- Name: TBLWORKORDERLINE_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERLINE_companyId_idx" ON wms."TBLWORKORDERLINE" USING btree ("companyId");


--
-- Name: TBLWORKORDERLINE_productId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERLINE_productId_idx" ON wms."TBLWORKORDERLINE" USING btree ("productId");


--
-- Name: TBLWORKORDERLINE_workOrderId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERLINE_workOrderId_idx" ON wms."TBLWORKORDERLINE" USING btree ("workOrderId");


--
-- Name: TBLWORKORDERLINE_workOrderId_lineNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLWORKORDERLINE_workOrderId_lineNo_key" ON wms."TBLWORKORDERLINE" USING btree ("workOrderId", "lineNo");


--
-- Name: TBLWORKORDERREASON_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERREASON_companyId_idx" ON wms."TBLWORKORDERREASON" USING btree ("companyId");


--
-- Name: TBLWORKORDERREFERENCEOPERATION_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDERREFERENCEOPERATION_companyId_idx" ON wms."TBLWORKORDERREFERENCEOPERATION" USING btree ("companyId");


--
-- Name: TBLWORKORDER_assignedToUserId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDER_assignedToUserId_idx" ON wms."TBLWORKORDER" USING btree ("assignedToUserId");


--
-- Name: TBLWORKORDER_companyId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDER_companyId_idx" ON wms."TBLWORKORDER" USING btree ("companyId");


--
-- Name: TBLWORKORDER_companyId_orderNo_key; Type: INDEX; Schema: wms; Owner: -
--

CREATE UNIQUE INDEX "TBLWORKORDER_companyId_orderNo_key" ON wms."TBLWORKORDER" USING btree ("companyId", "orderNo");


--
-- Name: TBLWORKORDER_salesOrderId_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDER_salesOrderId_idx" ON wms."TBLWORKORDER" USING btree ("salesOrderId");


--
-- Name: TBLWORKORDER_status_idx; Type: INDEX; Schema: wms; Owner: -
--

CREATE INDEX "TBLWORKORDER_status_idx" ON wms."TBLWORKORDER" USING btree (status);


--
-- Name: TBLINVOICELINE TBLINVOICELINE_invoiceId_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance."TBLINVOICELINE"
    ADD CONSTRAINT "TBLINVOICELINE_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES finance."TBLINVOICE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLSHIPMENTSTOP TBLSHIPMENTSTOP_shipmentId_fkey; Type: FK CONSTRAINT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENTSTOP"
    ADD CONSTRAINT "TBLSHIPMENTSTOP_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES logistics."TBLSHIPMENT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLSHIPMENT TBLSHIPMENT_vehicleId_fkey; Type: FK CONSTRAINT; Schema: logistics; Owner: -
--

ALTER TABLE ONLY logistics."TBLSHIPMENT"
    ADD CONSTRAINT "TBLSHIPMENT_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES logistics."TBLVEHICLE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPURCHASEORDERLINE TBLPURCHASEORDERLINE_orderId_fkey; Type: FK CONSTRAINT; Schema: procurement; Owner: -
--

ALTER TABLE ONLY procurement."TBLPURCHASEORDERLINE"
    ADD CONSTRAINT "TBLPURCHASEORDERLINE_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES procurement."TBLPURCHASEORDER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLSALESALLOCATION TBLSALESALLOCATION_orderLineId_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESALLOCATION"
    ADD CONSTRAINT "TBLSALESALLOCATION_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES sales."TBLSALESORDERLINE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLSALESORDERLINE TBLSALESORDERLINE_orderId_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: -
--

ALTER TABLE ONLY sales."TBLSALESORDERLINE"
    ADD CONSTRAINT "TBLSALESORDERLINE_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES sales."TBLSALESORDER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLAREA TBLAREA_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAREA"
    ADD CONSTRAINT "TBLAREA_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLAREA TBLAREA_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAREA"
    ADD CONSTRAINT "TBLAREA_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLAREA TBLAREA_warehouseId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLAREA"
    ADD CONSTRAINT "TBLAREA_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES wms."TBLWAREHOUSE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLBARCODETYPE TBLBARCODETYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBARCODETYPE"
    ADD CONSTRAINT "TBLBARCODETYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLBUSINESSPARTNER TBLBUSINESSPARTNER_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER"
    ADD CONSTRAINT "TBLBUSINESSPARTNER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLBUSINESSPARTNER TBLBUSINESSPARTNER_parentId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER"
    ADD CONSTRAINT "TBLBUSINESSPARTNER_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLBUSINESSPARTNER TBLBUSINESSPARTNER_partnerGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER"
    ADD CONSTRAINT "TBLBUSINESSPARTNER_partnerGroupId_fkey" FOREIGN KEY ("partnerGroupId") REFERENCES wms."TBLPARTNERGROUP"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLBUSINESSPARTNER TBLBUSINESSPARTNER_regionId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLBUSINESSPARTNER"
    ADD CONSTRAINT "TBLBUSINESSPARTNER_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES wms."TBLREGION"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLCONDITIONBREAKLOG TBLCONDITIONBREAKLOG_documentId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONDITIONBREAKLOG"
    ADD CONSTRAINT "TBLCONDITIONBREAKLOG_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES wms."TBLDOCUMENT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLCONTROLCOUNTLINE TBLCONTROLCOUNTLINE_controlCountId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLCONTROLCOUNTLINE"
    ADD CONSTRAINT "TBLCONTROLCOUNTLINE_controlCountId_fkey" FOREIGN KEY ("controlCountId") REFERENCES wms."TBLCONTROLCOUNT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTAPPROVALTYPE TBLDOCUMENTAPPROVALTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTAPPROVALTYPE"
    ADD CONSTRAINT "TBLDOCUMENTAPPROVALTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTLINESCOPE TBLDOCUMENTLINESCOPE_documentLineId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINESCOPE"
    ADD CONSTRAINT "TBLDOCUMENTLINESCOPE_documentLineId_fkey" FOREIGN KEY ("documentLineId") REFERENCES wms."TBLDOCUMENTLINE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_documentId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES wms."TBLDOCUMENT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_palletId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES wms."TBLPALLET"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_sourceLocationId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES wms."TBLLOCATION"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_sourceStatusId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_sourceStatusId_fkey" FOREIGN KEY ("sourceStatusId") REFERENCES wms."TBLSTATUS"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_targetLocationId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES wms."TBLLOCATION"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_targetStatusId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_targetStatusId_fkey" FOREIGN KEY ("targetStatusId") REFERENCES wms."TBLSTATUS"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTLINE TBLDOCUMENTLINE_unitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTLINE"
    ADD CONSTRAINT "TBLDOCUMENTLINE_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTSTATUSACTION TBLDOCUMENTSTATUSACTION_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSACTION"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSACTION_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTSTATUSCRITERIA TBLDOCUMENTSTATUSCRITERIA_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSCRITERIA"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSCRITERIA_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENTSTATUSCRITERIA TBLDOCUMENTSTATUSCRITERIA_targetStatusId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUSCRITERIA"
    ADD CONSTRAINT "TBLDOCUMENTSTATUSCRITERIA_targetStatusId_fkey" FOREIGN KEY ("targetStatusId") REFERENCES wms."TBLDOCUMENTSTATUS"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENTSTATUS TBLDOCUMENTSTATUS_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENTSTATUS"
    ADD CONSTRAINT "TBLDOCUMENTSTATUS_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_createdById_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_documentStatusId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_documentStatusId_fkey" FOREIGN KEY ("documentStatusId") REFERENCES wms."TBLDOCUMENTSTATUS"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_operationTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES wms."TBLOPERATIONTYPE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_reasonId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES wms."TBLREASON"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLDOCUMENT TBLDOCUMENT_warehouseId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLDOCUMENT"
    ADD CONSTRAINT "TBLDOCUMENT_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES wms."TBLWAREHOUSE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLENTRYCONDITIONPARAMETER TBLENTRYCONDITIONPARAMETER_entryConditionTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONPARAMETER"
    ADD CONSTRAINT "TBLENTRYCONDITIONPARAMETER_entryConditionTypeId_fkey" FOREIGN KEY ("entryConditionTypeId") REFERENCES wms."TBLENTRYCONDITIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLENTRYCONDITIONTYPE TBLENTRYCONDITIONTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLENTRYCONDITIONTYPE"
    ADD CONSTRAINT "TBLENTRYCONDITIONTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLEXITCONDITIONPARAMETER TBLEXITCONDITIONPARAMETER_exitConditionTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONPARAMETER"
    ADD CONSTRAINT "TBLEXITCONDITIONPARAMETER_exitConditionTypeId_fkey" FOREIGN KEY ("exitConditionTypeId") REFERENCES wms."TBLEXITCONDITIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLEXITCONDITIONTYPE TBLEXITCONDITIONTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXITCONDITIONTYPE"
    ADD CONSTRAINT "TBLEXITCONDITIONTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLEXTRAFIELDOPTION TBLEXTRAFIELDOPTION_extraFieldId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLEXTRAFIELDOPTION"
    ADD CONSTRAINT "TBLEXTRAFIELDOPTION_extraFieldId_fkey" FOREIGN KEY ("extraFieldId") REFERENCES wms."TBLEXTRAFIELD"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLFACILITY TBLFACILITY_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLFACILITY"
    ADD CONSTRAINT "TBLFACILITY_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLHANDHELDMENUITEM TBLHANDHELDMENUITEM_groupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLHANDHELDMENUITEM"
    ADD CONSTRAINT "TBLHANDHELDMENUITEM_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES wms."TBLHANDHELDMENUGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLINVENTORYRULE TBLINVENTORYRULE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINVENTORYRULE"
    ADD CONSTRAINT "TBLINVENTORYRULE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLINVENTORYRULE TBLINVENTORYRULE_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINVENTORYRULE"
    ADD CONSTRAINT "TBLINVENTORYRULE_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLINVENTORYRULE TBLINVENTORYRULE_warehouseId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLINVENTORYRULE"
    ADD CONSTRAINT "TBLINVENTORYRULE_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES wms."TBLWAREHOUSE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLABELTEMPLATEITEM TBLLABELTEMPLATEITEM_labelTemplateId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEITEM"
    ADD CONSTRAINT "TBLLABELTEMPLATEITEM_labelTemplateId_fkey" FOREIGN KEY ("labelTemplateId") REFERENCES wms."TBLLABELTEMPLATE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLABELTEMPLATEQUERY TBLLABELTEMPLATEQUERY_labelTemplateId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTEMPLATEQUERY"
    ADD CONSTRAINT "TBLLABELTEMPLATEQUERY_labelTemplateId_fkey" FOREIGN KEY ("labelTemplateId") REFERENCES wms."TBLLABELTEMPLATE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLABELTYPE TBLLABELTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLABELTYPE"
    ADD CONSTRAINT "TBLLABELTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLOCATIONCAPACITY TBLLOCATIONCAPACITY_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONCAPACITY"
    ADD CONSTRAINT "TBLLOCATIONCAPACITY_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLOCATIONGROUPLINK TBLLOCATIONGROUPLINK_locationGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUPLINK"
    ADD CONSTRAINT "TBLLOCATIONGROUPLINK_locationGroupId_fkey" FOREIGN KEY ("locationGroupId") REFERENCES wms."TBLLOCATIONGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLLOCATIONGROUPLINK TBLLOCATIONGROUPLINK_locationId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUPLINK"
    ADD CONSTRAINT "TBLLOCATIONGROUPLINK_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES wms."TBLLOCATION"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLLOCATIONGROUP TBLLOCATIONGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATIONGROUP"
    ADD CONSTRAINT "TBLLOCATIONGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLOCATION TBLLOCATION_areaId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES wms."TBLAREA"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLLOCATION TBLLOCATION_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLLOCATION TBLLOCATION_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLLOCATION TBLLOCATION_parentId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES wms."TBLLOCATION"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLLOCATION TBLLOCATION_warehouseId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLLOCATION"
    ADD CONSTRAINT "TBLLOCATION_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES wms."TBLWAREHOUSE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLOPERATIONGROUP TBLOPERATIONGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONGROUP"
    ADD CONSTRAINT "TBLOPERATIONGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLOPERATIONTYPELOCATION TBLOPERATIONTYPELOCATION_operationTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPELOCATION"
    ADD CONSTRAINT "TBLOPERATIONTYPELOCATION_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES wms."TBLOPERATIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLOPERATIONTYPEPALLETTYPE TBLOPERATIONTYPEPALLETTYPE_operationTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEPALLETTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPEPALLETTYPE_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES wms."TBLOPERATIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLOPERATIONTYPEREASON TBLOPERATIONTYPEREASON_operationTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPEREASON"
    ADD CONSTRAINT "TBLOPERATIONTYPEREASON_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES wms."TBLOPERATIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLOPERATIONTYPESTATUS TBLOPERATIONTYPESTATUS_operationTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPESTATUS"
    ADD CONSTRAINT "TBLOPERATIONTYPESTATUS_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES wms."TBLOPERATIONTYPE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLOPERATIONTYPETOLERANCEDETAIL TBLOPERATIONTYPETOLERANCEDETAIL_toleranceId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPETOLERANCEDETAIL"
    ADD CONSTRAINT "TBLOPERATIONTYPETOLERANCEDETAIL_toleranceId_fkey" FOREIGN KEY ("toleranceId") REFERENCES wms."TBLOPERATIONTYPETOLERANCE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLOPERATIONTYPE TBLOPERATIONTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLOPERATIONTYPE TBLOPERATIONTYPE_operationGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPE_operationGroupId_fkey" FOREIGN KEY ("operationGroupId") REFERENCES wms."TBLOPERATIONGROUP"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLOPERATIONTYPE TBLOPERATIONTYPE_sequenceId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLOPERATIONTYPE"
    ADD CONSTRAINT "TBLOPERATIONTYPE_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES wms."TBLSEQUENCE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPALLETNOTIFICATIONLINE TBLPALLETNOTIFICATIONLINE_notificationId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETNOTIFICATIONLINE"
    ADD CONSTRAINT "TBLPALLETNOTIFICATIONLINE_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES wms."TBLPALLETNOTIFICATION"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPALLETTYPE TBLPALLETTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETTYPE"
    ADD CONSTRAINT "TBLPALLETTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPALLETTYPE TBLPALLETTYPE_sequenceId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLETTYPE"
    ADD CONSTRAINT "TBLPALLETTYPE_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES wms."TBLSEQUENCE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPALLET TBLPALLET_baseUnitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET"
    ADD CONSTRAINT "TBLPALLET_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPALLET TBLPALLET_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET"
    ADD CONSTRAINT "TBLPALLET_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPALLET TBLPALLET_palletTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET"
    ADD CONSTRAINT "TBLPALLET_palletTypeId_fkey" FOREIGN KEY ("palletTypeId") REFERENCES wms."TBLPALLETTYPE"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPALLET TBLPALLET_parentPalletId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPALLET"
    ADD CONSTRAINT "TBLPALLET_parentPalletId_fkey" FOREIGN KEY ("parentPalletId") REFERENCES wms."TBLPALLET"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPARAMETER TBLPARAMETER_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARAMETER"
    ADD CONSTRAINT "TBLPARAMETER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPARTNERACCEPTANCETIME TBLPARTNERACCEPTANCETIME_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERACCEPTANCETIME"
    ADD CONSTRAINT "TBLPARTNERACCEPTANCETIME_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPARTNEREXTRAFIELD TBLPARTNEREXTRAFIELD_fieldDefId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELD"
    ADD CONSTRAINT "TBLPARTNEREXTRAFIELD_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES wms."TBLPARTNEREXTRAFIELDDEF"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPARTNEREXTRAFIELD TBLPARTNEREXTRAFIELD_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAFIELD"
    ADD CONSTRAINT "TBLPARTNEREXTRAFIELD_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPARTNEREXTRAGROUPLINK TBLPARTNEREXTRAGROUPLINK_extraGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUPLINK"
    ADD CONSTRAINT "TBLPARTNEREXTRAGROUPLINK_extraGroupId_fkey" FOREIGN KEY ("extraGroupId") REFERENCES wms."TBLPARTNEREXTRAGROUP"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPARTNEREXTRAGROUPLINK TBLPARTNEREXTRAGROUPLINK_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEREXTRAGROUPLINK"
    ADD CONSTRAINT "TBLPARTNEREXTRAGROUPLINK_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPARTNERFACILITY TBLPARTNERFACILITY_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERFACILITY"
    ADD CONSTRAINT "TBLPARTNERFACILITY_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPARTNERGROUP TBLPARTNERGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNERGROUP"
    ADD CONSTRAINT "TBLPARTNERGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPARTNEROPTIMIZATION TBLPARTNEROPTIMIZATION_partnerId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPARTNEROPTIMIZATION"
    ADD CONSTRAINT "TBLPARTNEROPTIMIZATION_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES wms."TBLBUSINESSPARTNER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPRINTER TBLPRINTER_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRINTER"
    ADD CONSTRAINT "TBLPRINTER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRINTER TBLPRINTER_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRINTER"
    ADD CONSTRAINT "TBLPRINTER_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTDETAILTYPE TBLPRODUCTDETAILTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTDETAILTYPE"
    ADD CONSTRAINT "TBLPRODUCTDETAILTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTFACILITY TBLPRODUCTFACILITY_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTFACILITY"
    ADD CONSTRAINT "TBLPRODUCTFACILITY_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPRODUCTGROUP TBLPRODUCTGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTGROUP"
    ADD CONSTRAINT "TBLPRODUCTGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTGROUP TBLPRODUCTGROUP_parentId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTGROUP"
    ADD CONSTRAINT "TBLPRODUCTGROUP_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES wms."TBLPRODUCTGROUP"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCTSUBGROUP TBLPRODUCTSUBGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBGROUP"
    ADD CONSTRAINT "TBLPRODUCTSUBGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTSUBSTITUTE TBLPRODUCTSUBSTITUTE_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBSTITUTE"
    ADD CONSTRAINT "TBLPRODUCTSUBSTITUTE_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPRODUCTSUBSTITUTE TBLPRODUCTSUBSTITUTE_substituteProductId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTSUBSTITUTE"
    ADD CONSTRAINT "TBLPRODUCTSUBSTITUTE_substituteProductId_fkey" FOREIGN KEY ("substituteProductId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTTYPE TBLPRODUCTTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTTYPE"
    ADD CONSTRAINT "TBLPRODUCTTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTUNITBARCODE TBLPRODUCTUNITBARCODE_productUnitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNITBARCODE"
    ADD CONSTRAINT "TBLPRODUCTUNITBARCODE_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES wms."TBLPRODUCTUNIT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPRODUCTUNIT TBLPRODUCTUNIT_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNIT"
    ADD CONSTRAINT "TBLPRODUCTUNIT_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLPRODUCTUNIT TBLPRODUCTUNIT_unitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNIT"
    ADD CONSTRAINT "TBLPRODUCTUNIT_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCTUNIT TBLPRODUCTUNIT_weightUnitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCTUNIT"
    ADD CONSTRAINT "TBLPRODUCTUNIT_weightUnitId_fkey" FOREIGN KEY ("weightUnitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCT TBLPRODUCT_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLPRODUCT TBLPRODUCT_detailTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_detailTypeId_fkey" FOREIGN KEY ("detailTypeId") REFERENCES wms."TBLPRODUCTDETAILTYPE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCT TBLPRODUCT_productGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES wms."TBLPRODUCTGROUP"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCT TBLPRODUCT_productSubGroupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_productSubGroupId_fkey" FOREIGN KEY ("productSubGroupId") REFERENCES wms."TBLPRODUCTSUBGROUP"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCT TBLPRODUCT_productTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES wms."TBLPRODUCTTYPE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLPRODUCT TBLPRODUCT_unitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLPRODUCT"
    ADD CONSTRAINT "TBLPRODUCT_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLREASON TBLREASON_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREASON"
    ADD CONSTRAINT "TBLREASON_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLREGION TBLREGION_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREGION"
    ADD CONSTRAINT "TBLREGION_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLREGION TBLREGION_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREGION"
    ADD CONSTRAINT "TBLREGION_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLREPORTCRITERIA TBLREPORTCRITERIA_reportId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTCRITERIA"
    ADD CONSTRAINT "TBLREPORTCRITERIA_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES wms."TBLREPORTDEF"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLREPORTFIELD TBLREPORTFIELD_reportId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLREPORTFIELD"
    ADD CONSTRAINT "TBLREPORTFIELD_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES wms."TBLREPORTDEF"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLROUTINGRULE TBLROUTINGRULE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGRULE"
    ADD CONSTRAINT "TBLROUTINGRULE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLROUTINGRULE TBLROUTINGRULE_routingTypeId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGRULE"
    ADD CONSTRAINT "TBLROUTINGRULE_routingTypeId_fkey" FOREIGN KEY ("routingTypeId") REFERENCES wms."TBLROUTINGTYPE"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLROUTINGTYPE TBLROUTINGTYPE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLROUTINGTYPE"
    ADD CONSTRAINT "TBLROUTINGTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSEQUENCE TBLSEQUENCE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSEQUENCE"
    ADD CONSTRAINT "TBLSEQUENCE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTATUS TBLSTATUS_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTATUS"
    ADD CONSTRAINT "TBLSTATUS_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTATUS TBLSTATUS_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTATUS"
    ADD CONSTRAINT "TBLSTATUS_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTOCKCOUNTLINE TBLSTOCKCOUNTLINE_countId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCKCOUNTLINE"
    ADD CONSTRAINT "TBLSTOCKCOUNTLINE_countId_fkey" FOREIGN KEY ("countId") REFERENCES wms."TBLSTOCKCOUNT"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLSTOCK TBLSTOCK_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTOCK TBLSTOCK_locationId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES wms."TBLLOCATION"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTOCK TBLSTOCK_palletId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES wms."TBLPALLET"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLSTOCK TBLSTOCK_productId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_productId_fkey" FOREIGN KEY ("productId") REFERENCES wms."TBLPRODUCT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTOCK TBLSTOCK_statusId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES wms."TBLSTATUS"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLSTOCK TBLSTOCK_unitId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLSTOCK"
    ADD CONSTRAINT "TBLSTOCK_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES wms."TBLUNIT"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUNIT TBLUNIT_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUNIT"
    ADD CONSTRAINT "TBLUNIT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUSERAUTHORIZATION TBLUSERAUTHORIZATION_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERAUTHORIZATION"
    ADD CONSTRAINT "TBLUSERAUTHORIZATION_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUSERAUTHORIZATION TBLUSERAUTHORIZATION_groupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERAUTHORIZATION"
    ADD CONSTRAINT "TBLUSERAUTHORIZATION_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES wms."TBLUSERGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERAUTHORIZATION TBLUSERAUTHORIZATION_userId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERAUTHORIZATION"
    ADD CONSTRAINT "TBLUSERAUTHORIZATION_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERCOLUMNAUTH TBLUSERCOLUMNAUTH_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERCOLUMNAUTH"
    ADD CONSTRAINT "TBLUSERCOLUMNAUTH_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUSERCOLUMNAUTH TBLUSERCOLUMNAUTH_groupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERCOLUMNAUTH"
    ADD CONSTRAINT "TBLUSERCOLUMNAUTH_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES wms."TBLUSERGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERCOLUMNAUTH TBLUSERCOLUMNAUTH_userId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERCOLUMNAUTH"
    ADD CONSTRAINT "TBLUSERCOLUMNAUTH_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERGROUPMEMBER TBLUSERGROUPMEMBER_groupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUPMEMBER"
    ADD CONSTRAINT "TBLUSERGROUPMEMBER_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES wms."TBLUSERGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERGROUPMEMBER TBLUSERGROUPMEMBER_userId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUPMEMBER"
    ADD CONSTRAINT "TBLUSERGROUPMEMBER_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERGROUP TBLUSERGROUP_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERGROUP"
    ADD CONSTRAINT "TBLUSERGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUSERROLE TBLUSERROLE_roleId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERROLE"
    ADD CONSTRAINT "TBLUSERROLE_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES wms."TBLROLE"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERROLE TBLUSERROLE_userId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERROLE"
    ADD CONSTRAINT "TBLUSERROLE_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERSCREENRIGHT TBLUSERSCREENRIGHT_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERSCREENRIGHT"
    ADD CONSTRAINT "TBLUSERSCREENRIGHT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLUSERSCREENRIGHT TBLUSERSCREENRIGHT_groupId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERSCREENRIGHT"
    ADD CONSTRAINT "TBLUSERSCREENRIGHT_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES wms."TBLUSERGROUP"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSERSCREENRIGHT TBLUSERSCREENRIGHT_userId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSERSCREENRIGHT"
    ADD CONSTRAINT "TBLUSERSCREENRIGHT_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLUSER TBLUSER_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLUSER"
    ADD CONSTRAINT "TBLUSER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLWAREHOUSE TBLWAREHOUSE_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSE"
    ADD CONSTRAINT "TBLWAREHOUSE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TBLWAREHOUSE TBLWAREHOUSE_facilityId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWAREHOUSE"
    ADD CONSTRAINT "TBLWAREHOUSE_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES wms."TBLFACILITY"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TBLWORKORDERLINE TBLWORKORDERLINE_workOrderId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDERLINE"
    ADD CONSTRAINT "TBLWORKORDERLINE_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES wms."TBLWORKORDER"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TBLWORKORDER TBLWORKORDER_companyId_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: -
--

ALTER TABLE ONLY wms."TBLWORKORDER"
    ADD CONSTRAINT "TBLWORKORDER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict GEerPe4tdJSeFeGprnn7yMOIcdOpAgnbH0hTD8zp9hblU3rVdWfWrro7I0CcenA

--
-- PostgreSQL database dump
--

\restrict JoJRnlpWySEepSBJDIZWMfJnrvJpasBQSEo6JJ1FOjVdB9f82NsF9UoTLMYtAgC

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
08cd3372-8080-437c-a0d7-0e8ec512bdc0	66fe27ff77271431f6193f9f109a1e81abb1dfe35a53132609349ffb0b6d1690	2026-06-11 11:56:04.012134+00	20260609115558_operation_config	\N	\N	2026-06-11 11:56:03.892809+00	1
b5e6b58a-0648-4339-9dd9-731314931c53	1d8fa459a3c9cf023703461ffb2d71acd6e283441cea04d1f982ea57070a42d9	2026-06-08 20:41:35.703869+00	20260608184711_init	\N	\N	2026-06-08 20:41:35.669786+00	1
b17be760-c4f5-4a08-94f8-d42fb54458f0	fc8a9bf3c6263e77f3900bfaf0b75647f51cee0743bb2dc5a87292f51b21917a	2026-06-09 13:49:05.120509+00	20260609134859_revert_invented_tables	\N	\N	2026-06-09 13:49:05.060231+00	1
2d083c99-e99d-4335-a681-17fa288b244c	1d30185b1ffda4661e31d3e46dd2a81c888fe0f08cd44bc6499bf3c8dc603c38	2026-06-08 20:41:35.918309+00	20260608190311_wms_core_schema	\N	\N	2026-06-08 20:41:35.707458+00	1
3ed93468-7040-489f-8572-3cac10eb0531	b88a300e23b7f20aecad2a9ba5cad1fa9a3e073cd0421afe619393b738b352fc	2026-06-08 20:44:33.176459+00	20260608204421_wms_phase1_core	\N	\N	2026-06-08 20:44:32.794469+00	1
67b2ee78-a1e4-460c-8af0-d9e53e45dca3	bbbfc069764e7ff01712f727f84d3a43591d20e60f120fe1a62d3a4315727389	2026-06-08 21:07:21.420226+00	20260608210646_wms_phase2_movement	\N	\N	2026-06-08 21:07:21.034204+00	1
9c3bc0e4-a276-4c32-b8ff-8ff3418c9ca5	00905f9c29e6393800875cd773a1a78e14d5240b419a1e91108b0cfcb194f96c	2026-06-09 15:06:10.101284+00	20260609150600_wms_definition_masters	\N	\N	2026-06-09 15:06:09.775951+00	1
f300a340-5573-4cb4-aed5-5420c29051af	620e4f1544f6c55cf7e1f12c4ba3e12bda2c240454928c6601f6f6146f855f68	2026-06-08 21:22:27.067991+00	20260608212218_wms_phase3_partner_tenant	\N	\N	2026-06-08 21:22:26.961552+00	1
7a44d877-5b9a-41bc-87e1-8c55867d303b	3c715476f079e9719f6e7710dd6e2a820431dc298f54d876beb56a4ba17bd95a	2026-06-09 05:55:24.409601+00	20260609055515_procurement_core	\N	\N	2026-06-09 05:55:24.260278+00	1
68288422-d3b8-4882-8ce6-3e9dc63360da	057a5c60b061fb6a987a9ccb7cef16b36680b9d0d6c9f6aa8210e47796155afc	2026-06-09 06:14:48.745072+00	20260609061438_sales_finance_superadmin	\N	\N	2026-06-09 06:14:48.564059+00	1
320e9523-86f8-4b44-b539-aca42c39ab64	1544595a7fa371c14a139d4314c295306fe4cdcb3a517990aefc4c773b01afdc	2026-06-09 15:40:10.076283+00	20260609154004_wire_definition_masters	\N	\N	2026-06-09 15:40:09.95479+00	1
3ca886c8-b51e-4f93-8f32-a360a9c80a56	6f5a0dc5bbd45ee80a57f118aa93681dd2d8672818d044478c8924c136683663	2026-06-09 08:20:32.906534+00	20260609082024_inventory_rules	\N	\N	2026-06-09 08:20:32.789856+00	1
6d333d7f-b45b-4097-8902-12546ce43478	2c03524f3d7a269f43fb472ab9e3f463a46602d61d79e89a1598e75aada1bbd6	2026-06-09 08:50:48.721309+00	20260609085039_sales_allocation	\N	\N	2026-06-09 08:50:48.679023+00	1
e943fc87-4b88-4688-a240-b7cf06c0316a	122fd1254797818bd5a07d58e69c4a3f1147c3a331b50f73a3288d8b3cffd2f6	2026-06-11 17:48:52.29166+00	20260609174844_location_capacity	\N	\N	2026-06-11 17:48:52.200789+00	1
f2133a00-8174-463c-8d9e-19cc6c80480a	14d37e247c94d0f192757f956cba66d84597c6ca1a2bbaca752abf517b515dd7	2026-06-09 09:13:10.818389+00	20260609091302_logistics	\N	\N	2026-06-09 09:13:10.636534+00	1
2f5b32f6-6dbb-4812-a1ca-cf662b1fc1b9	361493da4f9e70bed404ccc0a44413770a42f874d4eaa3184f24cf2b694db407	2026-06-09 16:24:32.137964+00	20260609162424_location_group_link	\N	\N	2026-06-09 16:24:32.087745+00	1
e28f0fa5-1d95-4eb3-9d6c-4a165cae7247	a96b774b492a5bbfd7d0d04c9762b7fc86fa0002d3f1386fa7b79c3e2c9f9885	2026-06-09 09:24:33.712907+00	20260609092425_counting_quality	\N	\N	2026-06-09 09:24:33.50986+00	1
a4d6afd6-ec0e-4643-93d2-6a1d7658163c	d870c16f17bd2d474c8913400aea494f57e666a61c05bfc5d7dc4d69524bec98	2026-06-09 09:36:11.642736+00	20260609093606_finance_invoicing	\N	\N	2026-06-09 09:36:11.558167+00	1
9cd6dd2e-f597-4237-b9d9-44f0e90b92e1	15e572ae331df9db97d53a4caa952d97fe5bc79f712634d330d2aa06aabfa7e1	2026-06-09 12:43:36.0479+00	20260609124328_wms_master_ledger	\N	\N	2026-06-09 12:43:35.887912+00	1
1ba08aa8-c6ea-4173-ae41-5e9f813a7dc9	fb5d81165c2017bde869c18cd5a5c2f4e8c22fff652f2bc45afafde52077f545	2026-06-09 18:03:04.109461+00	20260609180257_work_orders	\N	\N	2026-06-09 18:03:03.982627+00	1
a5dffcbc-0542-42ec-9ad1-2f281170fa9d	bb96ec927fb175b62ba0909777cf34ad3e8e6a55b9ed6cce23116ae0db9c0109	2026-06-15 11:52:08.07108+00	20260615115201_document_status	\N	\N	2026-06-15 11:52:08.028146+00	1
8764602a-8b6f-422d-9373-9818260c0fcb	dadf8bdcbacd3a84e6d644dd8cd7306815962241e5d222d6931d978fd6ca5619	2026-06-09 18:38:18.150784+00	20260609183808_workorder_sales_link	\N	\N	2026-06-09 18:38:18.104445+00	1
debcac7c-95b4-447a-ad77-00428483ca71	7f4f79dc0eabfe6237651f4f2ffb53cfe1b77ad8d714d11d60852f0e317b4c39	2026-06-11 17:56:48.402455+00	20260609175640_operation_type_config	\N	\N	2026-06-11 17:56:48.328846+00	1
bc257c53-1ce6-41a2-aab9-565674c4edd4	7d82084f43a1a74abcba6387b4bb58f0e27cb203278f3f651355757a85401e44	2026-06-10 13:20:26.139008+00	20260609132018_routing_conditions	\N	\N	2026-06-10 13:20:25.979183+00	1
62f41bf2-1cd9-495e-b2c4-813f1805136d	3e6b55430778373db32bbcb241f38761005c0c37bc1b88161987752560611ef4	2026-06-11 08:55:00.286642+00	20260609085454_demo_definitions	\N	\N	2026-06-11 08:55:00.126448+00	1
cbd19d4d-7128-42d0-8572-d950cc1e78a3	3377a5c739a31975652fb2cc2bf4c972945955ecaae423e786abcdf69a012260	2026-06-15 18:55:36.613554+00	20260615185504_optype_category_control_facility	\N	\N	2026-06-15 18:55:36.575763+00	1
306b95fb-bde9-4efd-996e-8c0604e68263	d6ca3bb9a9abd6bcbf1932626ce2c2d0dffb364dbb3fb578fe9ea20bcb7f5c5d	2026-06-11 18:05:37.401235+00	20260609180532_barcode_parameter	\N	\N	2026-06-11 18:05:37.325602+00	1
4c8836e9-aac7-44db-ad2d-ddf2f2209365	daa2092f996f750c4253c1b164e1456cebca7cd73b7b7d606b02a152e1cf9230	2026-06-15 12:31:52.413473+00	20260615123146_belge_tipleri	\N	\N	2026-06-15 12:31:52.340817+00	1
4c3e93f3-0198-44bd-ad46-626688795608	f208616d765a392682268e87d366b40f3f0d9ad05bab53b3169922473ab1848e	2026-06-15 11:00:55.619924+00	20260615105959_label_layout_json	\N	\N	2026-06-15 11:00:55.591698+00	1
f8243d78-de3a-4f8b-af3c-582e0c5310db	4707f970acff611cde7aca85aeafb8b1ea6424fff01e8ae465571c9ee536e678	2026-06-15 11:38:18.084758+00	20260615113801_printer	\N	\N	2026-06-15 11:38:18.008456+00	1
985ee55a-1055-4974-b9a9-eb890d691820	7c194413391f9c6c7ff8460376532d2aa16b4ab0baf343f58e8f8907b651e42e	2026-06-15 16:10:14.674436+00	20260615161008_genel_isemri_config	\N	\N	2026-06-15 16:10:14.429403+00	1
a408d164-4d21-4865-bc3c-74f11ce41817	e660bf1dc7dd97fd6901ef29d3e3e608f19bbacf2ea7717d599097bdf0dd23e2	2026-06-15 13:06:14.39219+00	20260615130608_operation_config	\N	\N	2026-06-15 13:06:14.224844+00	1
3ca21f7d-b952-4e1d-b313-4f392cb41734	9df36fffb774bf16a9d1a7d34cea2863402eb15d93b27eee91fa99d246819395	2026-06-15 13:43:12.40812+00	20260615134306_condition_routing_count	\N	\N	2026-06-15 13:43:12.170396+00	1
2dc5b47a-0538-4b5b-848e-7ec0e0bbb443	0e75ad537813cd1a3fb7536d90bcabf8f798a2716d26e7aa9709357d91c466c5	2026-06-15 18:32:17.074486+00	20260615183210_document_status_link	\N	\N	2026-06-15 18:32:17.045458+00	1
b5ec1f72-d113-4cb5-985e-b85c34f25711	452fb92b45517745335307c0c6b2f0b6b9fcef1d502337576d8fe6db6231c716	2026-06-15 18:14:12.292982+00	20260615181405_pallet_type_fields	\N	\N	2026-06-15 18:14:12.26132+00	1
73977d2f-c367-4a30-9259-14e5e56110ad	47499288bf9384b1f2c3a8a376c22765fa27042d25cd5fba96be0da30a1bf7a7	2026-06-15 21:27:22.691531+00	20260615212632_op_link_scope_facility	\N	\N	2026-06-15 21:27:22.572717+00	1
e0e962f7-87fd-4724-9dd7-1977c3e05408	6240f2be65897ec3e2081f84d92976857225795ce9cb09a1effe51857b533421	\N	20260616121336_product_type_detailtype_substitute	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260616121336_product_type_detailtype_substitute\n\nDatabase error code: 42601\n\nDatabase error:\nERROR: syntax error at or near "﻿"\n\nPosition:\n[1m  0[0m\n[1m  1[1;31m ﻿[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42601), message: "syntax error at or near \\"\\u{feff}\\"", detail: None, hint: None, position: Some(Original(1)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("scan.l"), line: Some(1244), routine: Some("scanner_yyerror") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260616121336_product_type_detailtype_substitute"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260616121336_product_type_detailtype_substitute"\n             at schema-engine\\commands\\src\\commands\\apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:255	2026-06-16 16:14:14.768566+00	2026-06-16 16:13:47.768823+00	0
67cd9e51-dd79-4ac5-bcf7-acab72599678	44ed6aebda9442b08e9a4e9e1390ae5c34404630737838764fab5a66d6372e71	2026-06-18 18:03:52.506078+00	20260618180330_count_type	\N	\N	2026-06-18 18:03:52.475052+00	1
0ecf4d88-6a3a-429b-96de-298bb4668066	a8207e806b08575e7af6db0af3a999b1ec37ce62b42ee110d7f654242efda512	2026-06-16 16:14:35.955458+00	20260616121336_product_type_detailtype_substitute	\N	\N	2026-06-16 16:14:35.805304+00	1
8c2cef56-724d-4b69-bb11-82eaa0b7fff9	9cbfa15650d48d19c08cfd4052f0ff7fb3aa04a47ca939785a6837520d3a8870	2026-06-16 17:08:22.186169+00	20260616130811_product_unit_nullable	\N	\N	2026-06-16 17:08:22.154808+00	1
533ef08d-9967-4539-80da-180a1212f2df	1df8eb0bc5f4cfef98c01095d4b6d865a400ef2f3bf240c4b7a5fd36ff5eec02	2026-06-17 19:12:02.439182+00	20260617191123_partner_enrich_region_facility	\N	\N	2026-06-17 19:12:02.338261+00	1
c4a753f0-4f38-4373-9a76-a662272a5ee7	daad67ebd7e323bab8728df44a4e22bff2766703406f609dd063dcfae98c1361	2026-06-18 18:16:58.09088+00	20260618181641_report_engine	\N	\N	2026-06-18 18:16:57.982822+00	1
d9c58f4c-fb27-4764-bb86-9ec5a36a7d65	0f816c0b9aba23a24e69040dbdeac345e9c8f00efbeb7ef98a0f1ba56dd1780e	2026-06-17 19:37:54.85574+00	20260617193722_partner_extra_groups_fields	\N	\N	2026-06-17 19:37:54.554814+00	1
adc55149-8d5d-4662-bbe7-0025a1e06de9	6c462457bb77486d5783a7cf53980d5141a6ac6ef108dd3f428132c9c181f442	2026-06-18 15:43:09.435786+00	20260618154236_condition_parameters_breaklog	\N	\N	2026-06-18 15:43:09.305219+00	1
73564045-f741-4283-9d0a-705e2bebebcf	86826dc8eacc242d29c520911d59169ecd9a7abeb6be721911dcbf208272dd28	2026-06-20 12:26:40.050495+00	20260620082637_consignment_po_stock_identity	\N	\N	2026-06-20 12:26:40.015716+00	1
78e2911a-5774-4650-9111-87bc295728a5	870162a72e954e96b1a5651d7f65e28e24096d3c84b077689c89989332d7f022	2026-06-18 17:03:45.120873+00	20260618170325_putaway_tolerance_shelflife	\N	\N	2026-06-18 17:03:45.095185+00	1
e2e6ac13-9613-414c-b306-3ff8cd183f13	f2e71cdd94ebf470f2a2f225b94c1c7f7d3cb70a4f381d26e728fa13f62f71cb	2026-06-20 09:10:14.593351+00	20260620050748_extra_field_saha	\N	\N	2026-06-20 09:10:14.504402+00	1
1f1f0eb7-4f0f-4930-bd9a-b96e80c6a723	36f6d639aa617fa7cfd3ee947e808e6dc0aa906e002dc887298a1e942647be63	2026-06-18 17:29:35.398189+00	20260618172920_integration_log	\N	\N	2026-06-18 17:29:35.342936+00	1
7455aacd-110b-4723-8588-6750c191dbff	152b8e5e0a9cef36d2ed375435dbeba314f13dcfd2906aa2f2c52458057a8bcb	2026-06-22 12:06:11.382537+00	20260622120605_screen_rights_user_fields	\N	\N	2026-06-22 12:06:11.314409+00	1
1f2ac30f-c08f-4c71-b1c9-0fc0de883e9b	04b7f803e6adfe9e395df995c6fe7341bdc104c9521c828f272d52a865a50486	2026-06-20 09:49:01.741965+00	20260620053000_document_assignment	\N	\N	2026-06-20 09:49:01.693479+00	1
a96b8cf6-0a2e-4cd3-8e1f-016468e40253	cc34567b38c7fc3ce032438be48624d0f85bd7d2b3f93b84546fb0a60ef87318	2026-06-20 12:27:21.598905+00	20260620073000_routing_op_facility	\N	\N	2026-06-20 12:27:21.58512+00	1
298e7b96-ae75-48dc-ab2f-7b40ce7e7c98	89cfc914d539dda65657b9ecdcfea6052c3b9909efa3048ed0d896216d9eab56	2026-06-20 11:07:04.98113+00	20260620070656_stock_ledger	\N	\N	2026-06-20 11:07:04.920182+00	1
e48d8b2b-a83a-44d7-b906-caafbcbb1ea0	b0c1a142bc4ff0dbde6d4c0a91e575c8ee37a572e2b2b06de56309d3d20a7a6e	2026-06-20 11:26:21.078487+00	20260620064500_count_pallet_screens	\N	\N	2026-06-20 11:26:20.956594+00	1
c37b676d-6ef3-4928-8936-db830c0a977c	2707320894b46b0a9bb4be9f973d97f64dc7ffaf85ff9a8492f2418ee261c13e	2026-06-20 18:04:32.238706+00	20260620180405_count_param_drop_isactive	\N	\N	2026-06-20 18:04:32.225959+00	1
804e40bb-567a-4c16-8bbe-9f82b226afe4	b36bf157322f3de3fd6e8fe8004d600eb4f77252eda59f9e719d14a5dd77920e	2026-06-20 12:15:58.051405+00	20260620081555_product_shelflife_catchweight	\N	\N	2026-06-20 12:15:58.03779+00	1
d2cf7d8a-6027-4e23-a9ce-e679acd67d61	a3f7a81acbb81c21939d7b984ea76d3feba42f2469f78000d00d2304fcc25abf	2026-06-20 12:29:11.914946+00	20260620073500_routing_op_linkscope	\N	\N	2026-06-20 12:29:11.897226+00	1
b1ec5826-ec42-4bc4-ade0-a3318d853583	20aa4e50710ac104aecb2e23d47f97f5e8aee2e812b8cefc848e8ef611b9da2e	2026-06-20 12:17:39.979716+00	20260620071500_routing_parameter	\N	\N	2026-06-20 12:17:39.939992+00	1
bf3d9dec-a50c-425e-b2da-8e56f47fcf99	063609580000d1bca58dd839bf3f99414457a44b5f413e4ab1759f5dd154c138	2026-06-20 12:42:06.328166+00	20260620081500_label_template	\N	\N	2026-06-20 12:42:06.25157+00	1
8e07f8ce-89e3-46ce-ae14-491a072e45fe	3e42b79b7db191d6fd0eb8005079e9e6bf3631a13be30496a2b7c7634dd014f9	2026-06-22 08:33:46.353021+00	20260622083340_user_screen_authorization	\N	\N	2026-06-22 08:33:46.311394+00	1
1ad013e1-9e59-483c-8701-92752ed2f6c4	5c0983bc5d004fceb3af43d1326c299a70b110b079ea3162e3b531223e180b69	2026-06-20 17:27:35.469491+00	20260620132732_document_line_scope	\N	\N	2026-06-20 17:27:35.426559+00	1
4b87a160-c53c-4abb-9627-0484085f9d6c	da22122b81ff94d0f743d49b73a5f41e6065dc357d1ed0cc426e4993626fbeb8	2026-06-21 20:49:00.177815+00	20260621204836_barcode_company_unique	\N	\N	2026-06-21 20:49:00.070434+00	1
4e80938f-a3f6-4869-afe3-5bad4229e21f	3e6b22eeca671bf68971396bbe0df3a61e2756b0c071095c1e30489315a77083	2026-06-22 07:31:45.104179+00	20260622073130_user_authorization	\N	\N	2026-06-22 07:31:45.030662+00	1
fceb84cd-9409-463c-bc02-72292c3fc20e	c057c6c24226688393cd47e0d651e6a352bca1b570b071de3cb46f4b4d602dc5	2026-06-22 11:42:05.652603+00	20260622114152_user_column_auth	\N	\N	2026-06-22 11:42:05.570575+00	1
219b5db7-0d99-4e9a-bb61-fed5738015a1	5840ee5c0bcaa2ee5f9e483aa3653bd86779fa40e02c86bced70bac5ccc3e359	2026-06-22 09:06:11.733642+00	20260622090604_user_groups	\N	\N	2026-06-22 09:06:11.613241+00	1
dffe10e1-4a93-4f99-abae-d97eff87e730	c504e3ace199abc1f6af739035bca380c1bc66a2ef154e80bb87dfa8e359d9fb	2026-06-22 12:30:20.162945+00	20260622123014_handheld_menu	\N	\N	2026-06-22 12:30:20.093761+00	1
f004ef2f-f9f5-42a7-872c-25f9aba00cab	66ca7b96bfa261e1fc5c0c143300f089103fa05a9860f3529c5ebfc1ac026043	2026-06-22 14:56:58.104826+00	20260622145651_product_facility	\N	\N	2026-06-22 14:56:58.044333+00	1
f410d7b7-0c93-4564-85d8-a9a0ee5ee4e5	a92e432b2481c99aefef380e317556bc90a160963781232212b4c29e650d0f83	2026-06-22 15:07:01.210769+00	20260622150656_partner_facility	\N	\N	2026-06-22 15:07:01.1675+00	1
bfab4b07-1c4f-4803-a7ed-393553e4ad4f	704bb874b2520727da3708d9247aa11dbff0350ffc9ffff4436959e0fb87a8a2	2026-06-22 17:33:06.251535+00	20260622173218_status_facility	\N	\N	2026-06-22 17:33:06.187878+00	1
5ef03b76-fa54-4577-9fc8-5860f104e5a4	29ef0e2a368fa9b96996c7a397482922a2429129ac742c615e1eeeff355c28d2	2026-06-22 17:50:57.322016+00	20260622175052_status_single_facility	\N	\N	2026-06-22 17:50:57.254968+00	1
e0d5d93d-3cb2-402c-838e-2c725f3d716b	ebed4c1fcbb8dce42f070a604682f13df712ff651484b3fc7cfbe341a62c66fe	\N	20260622180500_tenant_everywhere	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260622180500_tenant_everywhere\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "TBLPURCHASEORDERLINE" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"TBLPURCHASEORDERLINE\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(434), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260622180500_tenant_everywhere"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260622180500_tenant_everywhere"\n             at schema-engine\\commands\\src\\commands\\apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:255	2026-06-22 18:06:03.728747+00	2026-06-22 18:05:04.042508+00	0
8c763fba-d699-428e-b46e-26422de787c2	8767a3fe9f6a06dd85cd3860a0c103ee77427b4ef35a4e13c335ddcda6089cb1	2026-06-22 18:06:56.595563+00	20260622180500_tenant_everywhere	\N	\N	2026-06-22 18:06:56.381606+00	1
c65494c0-249d-4713-88dc-7863974afdf9	dff82adfcbd905240b44a2d26641cd9b902340a30086906cf13dd6b6a8bbd580	2026-06-30 16:04:10.640102+00	20260630120000_document_warehouse_optional	\N	\N	2026-06-30 16:04:10.621168+00	1
7fe4a5f6-3366-46f4-8a37-5e26f712d25c	063aa88f7d0eb4ec42b9e8cc5c74c9c9b682d778ccc2d78da49a3b2b4bbd0bc5	2026-06-22 19:05:48.858544+00	20260622190545_reason_facility	\N	\N	2026-06-22 19:05:48.822281+00	1
873ce1d2-544b-42b8-be2a-81ecac4898ee	8e17d874f0b63faba1277b5acdaa1128e0ec064bb07ad7237da1d6b3869f61c8	2026-06-28 13:10:56.371033+00	20260628131051_optypestatus_target_nullable	\N	\N	2026-06-28 13:10:56.341135+00	1
4d335368-0ca1-43fa-86d9-e8de5cdcb5b3	cfccd33e03b9160e8b06f5ba75111434576018e85a74c4a40e2cd287af4c384d	2026-06-22 19:22:49.69255+00	20260622192246_optype_partial_extrafield_facility	\N	\N	2026-06-22 19:22:49.626794+00	1
56b4274b-c587-4099-93e5-b63350efefaf	ea7c9f6b3b8ce7e6bdc3aa749e7cc8ccbdb3804a37a9701f524adb5f8e196b56	2026-06-23 08:09:39.50871+00	20260623080936_drop_company_taxnumber	\N	\N	2026-06-23 08:09:39.489292+00	1
5b8d7f49-8d0e-450a-bc58-4953ae0106f1	804c177098e0adda576283b71161687ed43e238ad50c03c1bd5c42812f7ca455	2026-06-23 08:51:37.208842+00	20260623085134_status_unique_facility_code	\N	\N	2026-06-23 08:51:37.164252+00	1
b6107372-99fd-44f2-a112-a7a9ab1c7b04	283d1e769dd5e5aeaa616edc04b5e63c04e7aa06ab99b2ec01758d2d1c75a20f	2026-06-28 19:19:00.095611+00	20260628191830_tolerance_master_detail	\N	\N	2026-06-28 19:19:00.000436+00	1
b29b7431-6dab-4b27-a43c-48940578ef0d	89d19f47b842ad4a58630b67598c576a7f1993cd3fc7ddfd26b8a70bf1484f70	2026-06-24 09:00:17.266212+00	20260624085944_printer_legacy_sade	\N	\N	2026-06-24 09:00:17.177168+00	1
7ae78597-2f3e-4250-a2ab-ab5328110121	e33b19a1f8eac2d47affb5fafe5023ff257960f7718c2ae278dbb8894d9cfb79	2026-06-27 18:51:20.821724+00	20260627185040_facility_drop_city_address	\N	\N	2026-06-27 18:51:20.774412+00	1
390db0c6-1840-439c-9868-847e40a625a0	8af5a0c66175f394c0f109f49be03d92692a7ccfde0ea75b45fb7a6758e8af67	2026-06-28 09:48:55.731825+00	20260628094826_area_location_facilityid	\N	\N	2026-06-28 09:48:55.630291+00	1
b4e27bb4-a9a1-481c-8ef5-93767d2be9da	92a83b4db729173c01da32125e3b795f7d058d90de5c2be0fc5f86daf0c8a771	2026-06-29 09:51:33.485271+00	20260629095107_tolerance_detail_unit_percent	\N	\N	2026-06-29 09:51:33.434627+00	1
2bc583b4-59ef-4adf-aa9b-e10c20d6a030	e49d376b165068607e65c61199c821f6a270947e9d4f90921afc4035c8f29747	2026-07-02 19:42:26.092675+00	20260702120000_count_link_scope	\N	\N	2026-07-02 19:42:26.052399+00	1
3ab6212c-9ed0-4345-9b46-372e866f5fa6	f6399f44cc8db68bc8f01e9b7c0da453cb84c6f53b9bab8864350d4591e4b2ae	2026-06-29 12:28:54.258293+00	20260629122831_docstatus_drop_sortorder	\N	\N	2026-06-29 12:28:54.225151+00	1
619dcc51-6824-4abf-8e9a-99352bc411e7	4de98f7e23650beb9b47529009115d52cf9cacde647a276e0124223df5270a41	2026-06-29 19:07:53.27401+00	20260629190719_docstatus_criteria_rules	\N	\N	2026-06-29 19:07:53.205801+00	1
b34b3a6f-3f15-49f4-8e0e-c77c0756dc09	b295e9c621447334915c2cbc6590db66237350f1a0e2bb934fbcf775f1c70e2a	2026-06-29 19:25:54.803225+00	20260629192547_docstatus_history	\N	\N	2026-06-29 19:25:54.764534+00	1
7589a33b-270e-42e9-8299-3659bb4536d5	4fae03004c65af21949bb209e9d79fe453c8f57311f400534e7010bfae58ae91	2026-07-02 20:00:51.731667+00	20260702130000_count_equalize_param	\N	\N	2026-07-02 20:00:51.69781+00	1
d8bb9805-7465-454c-b0c2-e62a9d193389	b04b718d712d2d45887447b561e11bfd9e66ea59167bbe4863b29cd0a0e752ff	2026-06-29 22:18:09.537191+00	20260629221805_scope_production_expiry	\N	\N	2026-06-29 22:18:09.509156+00	1
\.


--
-- PostgreSQL database dump complete
--

\unrestrict JoJRnlpWySEepSBJDIZWMfJnrvJpasBQSEo6JJ1FOjVdB9f82NsF9UoTLMYtAgC

