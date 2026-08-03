-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cores" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nome_completo" VARCHAR(120) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "observacoes" VARCHAR(500),
    "cor_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cores_slug_key" ON "cores"("slug");

-- CreateIndex
CREATE INDEX "cores_ativa_ordem_idx" ON "cores"("ativa", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_cor_id_idx" ON "clientes"("cor_id");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "cores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
