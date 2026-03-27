const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'backend', 'src', 'api');

// Remove old directories
const dirsToRemove = ['make', 'car-model', 'year', 'part', 'variant-spec', 'deposit-rule', 'branch', 'time-slot', 'booking'];
dirsToRemove.forEach(dir => {
  const fullPath = path.join(srcDir, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

const contentTypes = [
  {
    name: 'vehicle-data',
    plural: 'vehicle-datas',
    display: 'Vehicle Data',
    attributes: {
      Make: { type: 'string', required: true },
      Model: { type: 'string', required: true },
      Year: { type: 'string', required: true },
      Part: { type: 'string', required: true },
      Spec_Variant: { type: 'string' },
      Price_Original: { type: 'decimal', required: true },
      Deposit_Required: { type: 'boolean', default: false }
    }
  },
  {
    name: 'branch-data',
    plural: 'branch-datas',
    display: 'Branch Data',
    attributes: {
      BranchCode: { type: 'string', required: true, unique: true },
      BranchName: { type: 'string', required: true },
      Address: { type: 'text' },
      Contact: { type: 'string' },
      Status: { type: 'enumeration', enum: ['Active', 'Inactive'], default: 'Active' },
      LeadTimeMinutes: { type: 'integer', default: 120 },
      TimeSlots: { type: 'text', required: true } 
    }
  },
  {
    name: 'booking',
    plural: 'bookings',
    display: 'Booking',
    attributes: {
      ReferenceNumber: { type: 'string', unique: true },
      Status: { type: 'enumeration', enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
      CancellationReason: { type: 'text' },
      AppointmentDate: { type: 'date' },
      AppointmentTime: { type: 'time' },
      CarPlateNumber: { type: 'string' },
      DriverName: { type: 'string' },
      Phone: { type: 'string' },
      Email: { type: 'email' },
      ICNumber: { type: 'string' },
      TotalAmount: { type: 'decimal' },
      DepositPaid: { type: 'decimal' },
      CurlecTransactionID: { type: 'string' },
      VehicleDetailsJSON: { type: 'json' }, 
      BranchCode: { type: 'string' }, 
      BranchName: { type: 'string' },
      InsuranceFile: { type: 'media', multiple: true, allowedTypes: ['images', 'files'] }
    }
  }
];

contentTypes.forEach(ct => {
  const apiDirPath = path.join(srcDir, ct.name);
  const contentTypesPath = path.join(apiDirPath, 'content-types', ct.name);
  const controllersPath = path.join(apiDirPath, 'controllers');
  const routesPath = path.join(apiDirPath, 'routes');
  const servicesPath = path.join(apiDirPath, 'services');

  [contentTypesPath, controllersPath, routesPath, servicesPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const schema = {
    kind: "collectionType",
    collectionName: ct.plural.replace(/-/g, '_'),
    info: {
      singularName: ct.name,
      pluralName: ct.plural,
      displayName: ct.display
    },
    options: { draftAndPublish: false },
    pluginOptions: {},
    attributes: ct.attributes
  };
  fs.writeFileSync(path.join(contentTypesPath, 'schema.json'), JSON.stringify(schema, null, 2));

  const tsController = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreController('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(controllersPath, `${ct.name}.ts`), tsController);

  const tsRoute = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreRouter('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(routesPath, `${ct.name}.ts`), tsRoute);

  const tsService = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreService('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(servicesPath, `${ct.name}.ts`), tsService);

  console.log(`Generated ${ct.name}`);
});
console.log('Done!');
