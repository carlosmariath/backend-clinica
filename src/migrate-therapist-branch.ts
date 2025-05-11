import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Ler o arquivo original
const originalSchema = fs.readFileSync(schemaPath, 'utf8');

// Modelo Branch modificado
const newBranchModel = `model Branch {
  id          String        @id @default(uuid())
  name        String
  address     String
  phone       String
  email       String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  // Relacionamentos
  users        User[]
  therapistBranches TherapistBranch[]
  schedules    Schedule[]
  appointments Appointment[]
  services     Service[]
}`;

// Modelo Therapist modificado
const newTherapistModel = `model Therapist {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  phone        String
  specialty    String
  schedules    Schedule[] // 🔹 Relação com horários disponíveis
  appointments Appointment[] // 🔹 Relação com agendamentos
  createdAt    DateTime      @default(now())
  therapistServices TherapistService[] // 🔹 Relação com serviços oferecidos
  
  // Relação muitos-para-muitos com filiais
  therapistBranches TherapistBranch[]
}`;

// Modelo Schedule modificado
const newScheduleModel = `model Schedule {
  id          String @id @default(uuid())
  therapistId String
  branchId    String  // Nova coluna para filial
  dayOfWeek   Int // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  startTime   String // Exemplo: "09:00"
  endTime     String // Exemplo: "18:00"

  therapist Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  branch    Branch    @relation(fields: [branchId], references: [id], onDelete: Cascade)
}`;

// Novo modelo TherapistBranch para ser adicionado
const newTherapistBranchModel = `model TherapistBranch {
  id           String    @id @default(uuid())
  therapistId  String
  branchId     String
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  
  therapist    Therapist @relation(fields: [therapistId], references: [id], onDelete: Cascade)
  branch       Branch    @relation(fields: [branchId], references: [id], onDelete: Cascade)
  
  @@unique([therapistId, branchId])
}`;

// Substituir os modelos existentes pelos novos
let newSchema = originalSchema;

// Substituir Branch
newSchema = newSchema.replace(/model Branch \{(\n|.)*?\}/s, newBranchModel);

// Substituir Therapist
newSchema = newSchema.replace(
  /model Therapist \{(\n|.)*?\}/s,
  newTherapistModel,
);

// Substituir Schedule
newSchema = newSchema.replace(/model Schedule \{(\n|.)*?\}/s, newScheduleModel);

// Adicionar TherapistBranch após o modelo Therapist
newSchema = newSchema.replace(
  newTherapistModel,
  `${newTherapistModel}\n\n${newTherapistBranchModel}`,
);

// Escrever o novo schema
fs.writeFileSync(schemaPath, newSchema, 'utf8');

console.log('Schema atualizado com sucesso!');
console.log('Execute o comando para criar a migração:');
console.log('npx prisma migrate dev --name add_therapist_branch');
