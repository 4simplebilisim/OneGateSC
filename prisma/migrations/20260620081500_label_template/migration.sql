-- CreateTable
CREATE TABLE "TBLLABELTEMPLATE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "screenTitle" VARCHAR(120),
    "labelName" VARCHAR(120),
    "menuGroupId" INTEGER,
    "displayType" INTEGER,
    "reportType" INTEGER,
    "col1Count" INTEGER,
    "col2Count" INTEGER,
    "col3Count" INTEGER,
    "col1Length" INTEGER,
    "col2Length" INTEGER,
    "password" VARCHAR(40),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLABELTEMPLATE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLLABELTEMPLATEITEM" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "labelTemplateId" INTEGER NOT NULL,
    "title" VARCHAR(120),
    "itemType" VARCHAR(20),
    "designName" VARCHAR(80),
    "displayName" VARCHAR(120),
    "sortOrder" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "width" INTEGER,
    "maxLength" INTEGER,
    "defaultValue" VARCHAR(200),
    "comboQuery" TEXT,
    "lookupId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLABELTEMPLATEITEM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLLABELTEMPLATEQUERY" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "labelTemplateId" INTEGER NOT NULL,
    "code" VARCHAR(40),
    "queryTitle" VARCHAR(200),
    "queryDetail" TEXT,
    "bindingField" VARCHAR(80),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLABELTEMPLATEQUERY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLLABELTEMPLATE_companyId_idx" ON "TBLLABELTEMPLATE"("companyId");

-- CreateIndex
CREATE INDEX "TBLLABELTEMPLATEITEM_companyId_idx" ON "TBLLABELTEMPLATEITEM"("companyId");

-- CreateIndex
CREATE INDEX "TBLLABELTEMPLATEITEM_labelTemplateId_idx" ON "TBLLABELTEMPLATEITEM"("labelTemplateId");

-- CreateIndex
CREATE INDEX "TBLLABELTEMPLATEQUERY_companyId_idx" ON "TBLLABELTEMPLATEQUERY"("companyId");

-- CreateIndex
CREATE INDEX "TBLLABELTEMPLATEQUERY_labelTemplateId_idx" ON "TBLLABELTEMPLATEQUERY"("labelTemplateId");

-- AddForeignKey
ALTER TABLE "TBLLABELTEMPLATEITEM" ADD CONSTRAINT "TBLLABELTEMPLATEITEM_labelTemplateId_fkey" FOREIGN KEY ("labelTemplateId") REFERENCES "TBLLABELTEMPLATE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLLABELTEMPLATEQUERY" ADD CONSTRAINT "TBLLABELTEMPLATEQUERY_labelTemplateId_fkey" FOREIGN KEY ("labelTemplateId") REFERENCES "TBLLABELTEMPLATE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

