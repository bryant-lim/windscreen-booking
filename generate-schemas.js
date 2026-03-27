const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'backend', 'src', 'api');

const contentTypes = [
  {
    name: 'make',
    plural: 'makes',
    display: 'Make',
    attributes: {
      Name: { type: 'string', required: true, unique: true },
      Slug: { type: 'uid', targetField: 'Name' },
      Logo: { type: 'media', multiple: false, allowedTypes: ['images'] },
      car_models: { type: 'relation', relation: 'oneToMany', target: 'api::car-model.car-model', mappedBy: 'make' }
    }
  },
  {
    name: 'car-model',
    plural: 'car-models',
    display: 'CarModel',
    attributes: {
      Name: { type: 'string', required: true },
      Slug: { type: 'uid', targetField: 'Name' },
      make: { type: 'relation', relation: 'manyToOne', target: 'api::make.make', inversedBy: 'car_models' },
      years: { type: 'relation', relation: 'oneToMany', target: 'api::year.year', mappedBy: 'car_model' }
    }
  },
  {
    name: 'year',
    plural: 'years',
    display: 'Year',
    attributes: {
      YearText: { type: 'string', required: true },
      car_model: { type: 'relation', relation: 'manyToOne', target: 'api::car-model.car-model', inversedBy: 'years' },
      parts: { type: 'relation', relation: 'oneToMany', target: 'api::part.part', mappedBy: 'year' }
    }
  },
  {
    name: 'part',
    plural: 'parts',
    display: 'Part',
    attributes: {
      Name: { type: 'string', required: true },
      Price: { type: 'decimal', required: true },
      year: { type: 'relation', relation: 'manyToOne', target: 'api::year.year', inversedBy: 'parts' },
      variant_specs: { type: 'relation', relation: 'oneToMany', target: 'api::variant-spec.variant-spec', mappedBy: 'part' }
    }
  },
  {
    name: 'variant-spec',
    plural: 'variant-specs',
    display: 'VariantSpec',
    attributes: {
      Name: { type: 'string', required: true },
      part: { type: 'relation', relation: 'manyToOne', target: 'api::part.part', inversedBy: 'variant_specs' }
    }
  },
  {
    name: 'deposit-rule',
    plural: 'deposit-rules',
    display: 'DepositRule',
    attributes: {
      DepositRequired: { type: 'boolean', default: false },
      DepositPercentage: { type: 'integer' },
      make: { type: 'relation', relation: 'oneToOne', target: 'api::make.make' },
      car_model: { type: 'relation', relation: 'oneToOne', target: 'api::car-model.car-model' },
      year: { type: 'relation', relation: 'oneToOne', target: 'api::year.year' },
      part: { type: 'relation', relation: 'oneToOne', target: 'api::part.part' }
    }
  },
  {
    name: 'branch',
    plural: 'branches',
    display: 'Branch',
    attributes: {
      BranchCode: { type: 'string', required: true, unique: true },
      BranchName: { type: 'string', required: true },
      Address: { type: 'text' },
      Phone: { type: 'string' },
      Email: { type: 'email' },
      Status: { type: 'enumeration', enum: ['Active', 'Inactive'], default: 'Active' },
      AdvanceBookingDays: { type: 'integer', default: 1 },
      DefaultLeadTimeMinutes: { type: 'integer', default: 120 },
      time_slots: { type: 'relation', relation: 'oneToMany', target: 'api::time-slot.time-slot', mappedBy: 'branch' }
    }
  },
  {
    name: 'time-slot',
    plural: 'time-slots',
    display: 'TimeSlot',
    attributes: {
      StartTime: { type: 'time', required: true },
      EndTime: { type: 'time', required: true },
      Capacity: { type: 'integer', required: true, default: 1 },
      branch: { type: 'relation', relation: 'manyToOne', target: 'api::branch.branch', inversedBy: 'time_slots' }
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
      Summary: { type: 'json' },
      branch: { type: 'relation', relation: 'oneToOne', target: 'api::branch.branch' },
      time_slot: { type: 'relation', relation: 'oneToOne', target: 'api::time-slot.time-slot' },
      part: { type: 'relation', relation: 'oneToOne', target: 'api::part.part' },
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

  // Create directories
  [contentTypesPath, controllersPath, routesPath, servicesPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Write schema.json
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

  // Write controller
  const tsController = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreController('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(controllersPath, `${ct.name}.ts`), tsController);

  // Write route
  const tsRoute = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreRouter('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(routesPath, `${ct.name}.ts`), tsRoute);

  // Write service
  const tsService = `import { factories } from '@strapi/strapi';\nexport default factories.createCoreService('api::${ct.name}.${ct.name}');`;
  fs.writeFileSync(path.join(servicesPath, `${ct.name}.ts`), tsService);

  console.log(`Generated ${ct.name}`);
});
console.log('Done!');
