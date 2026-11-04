import { PageGuide } from './types';

export const MASTER_GUIDES: Record<string, PageGuide> = {
  'new-property': {
    pageKey: 'new-property',
    title: {
      en: 'How to Add a New Property',
      es: 'Cómo Registrar una Nueva Propiedad',
    },
    subtitle: {
      en: 'Follow these 4 simple steps to register a property asset in your ledger.',
      es: 'Siga estos 4 sencillos pasos para registrar una propiedad en su sistema de gestión.',
    },
    steps: {
      en: [
        {
          stepNumber: 1,
          title: 'Basic Info & Property Type',
          description: 'Enter the Property Name, select its Type (such as Apartment or Commercial), and set its initial Status to Active.',
        },
        {
          stepNumber: 2,
          title: 'Address & Unit Structure',
          description: 'Fill in the complete street address, city, state, country, and zip code. Then specify total floors and total units in the building.',
        },
        {
          stepNumber: 3,
          title: 'Assign Owner & Ownership %',
          description: 'Select the assigned Property Owner from the dropdown or click "+ Add Owner" to create one. Enter their ownership percentage (usually 100%).',
        },
        {
          stepNumber: 4,
          title: 'Payment Setup & Save',
          description: 'Keep company default payment settings or configure a custom gateway. Optionally expand "Additional Details" for photos and valuation, then click "Create Property".',
        },
      ],
      es: [
        {
          stepNumber: 1,
          title: 'Información Básica y Tipo',
          description: 'Ingrese el Nombre de la Propiedad, seleccione el Tipo (como Apartamento o Comercial) y configure el estado en Activo.',
        },
        {
          stepNumber: 2,
          title: 'Dirección y Unidades',
          description: 'Complete la dirección, ciudad, estado, país y código postal. Luego defina el total de pisos y unidades del edificio.',
        },
        {
          stepNumber: 3,
          title: 'Asignar Propietario y Porcentaje',
          description: 'Seleccione el Propietario asignado del menú o haga clic en "+ Agregar Propietario". Ingrese el porcentaje de propiedad (generalmente 100%).',
        },
        {
          stepNumber: 4,
          title: 'Configuración de Pagos y Guardar',
          description: 'Mantenga la pasarela de pagos predeterminada o configure una personalizada. Opcionalmente añada fotos y documentos, y haga clic en "Crear Propiedad".',
        },
      ],
    },
  },
  'properties-list': {
    pageKey: 'properties-list',
    title: {
      en: 'How to Manage Properties & Portfolio',
      es: 'Cómo Gestionar Propiedades y Portafolio',
    },
    subtitle: {
      en: 'Learn how to oversee assets, filter properties, and run exports.',
      es: 'Aprenda a supervisar activos, filtrar propiedades y realizar exportaciones.',
    },
    steps: {
      en: [
        {
          stepNumber: 1,
          title: 'Create or Import Properties',
          description: 'Click "+ Add Property" on the top right to add a single property, or use "Import Excel" to upload multiple properties at once.',
        },
        {
          stepNumber: 2,
          title: 'Filter & Search',
          description: 'Quickly find assets by typing in the search bar or filtering by Property Type, Status, or Owner.',
        },
        {
          stepNumber: 3,
          title: 'Review Financials & Actions',
          description: 'View real-time occupancy rates, unit counts, and monthly revenue. Use the action buttons on the right to view, edit, or delete.',
        },
      ],
      es: [
        {
          stepNumber: 1,
          title: 'Crear o Importar Propiedades',
          description: 'Haga clic en "+ Agregar Propiedad" para añadir una propiedad, o use "Importar Excel" para cargar varias a la vez.',
        },
        {
          stepNumber: 2,
          title: 'Filtrar y Buscar',
          description: 'Encuentre activos escribiendo en la barra de búsqueda o filtrando por Tipo, Estado o Propietario.',
        },
        {
          stepNumber: 3,
          title: 'Revisar Finanzas y Acciones',
          description: 'Supervise tasas de ocupación, unidades y rentas mensuales. Use los botones de acción para ver, editar o eliminar.',
        },
      ],
    },
  },
};

