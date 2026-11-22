// Configuración del simulador.
// - PREGUNTAS_POR_EXAMEN: número de preguntas por defecto (cada usuario puede cambiarlo en ⚙ Personalizar).
// - FIREBASE: datos del proyecto de Firebase para guardar usuarios y estadísticas en la nube
//   (ver FIREBASE.md). Si se deja en null, los usuarios se guardan solo en este navegador.
// - ADMIN_EMAIL: correo de la cuenta "Valdepony" creada en Firebase Authentication.
var CONFIG = {
  PREGUNTAS_POR_EXAMEN: 20,
  FIREBASE: {
    apiKey: "AIzaSyA8L2HFIQpypWxbLHQE74hhCZ9Lxx4dab0",
    authDomain: "asesoria-imagen-c1110.firebaseapp.com",
    projectId: "asesoria-imagen-c1110",
    storageBucket: "asesoria-imagen-c1110.firebasestorage.app",
    messagingSenderId: "711244363722",
    appId: "1:711244363722:web:4593b98dd83898f4c08133"
  },
  ADMIN_EMAIL: "valdepony@asesoria-imagen.app"
};

var ASIGNATURAS = [
  { id: "protocolo", nombre: "Protocolo y organización de eventos",
    temas: ["Introducción al protocolo. Asesoría y campo de actuación",
            "Organización del protocolo del Estado español",
            "El protocolo oficial español",
            "Títulos y tratamientos honoríficos",
            "Simbología, heráldica y vexilología",
            "Protocolo social"] },
  { id: "comunicacion", nombre: "Habilidades comunicativas",
    temas: ["Introducción a la comunicación",
            "Tipos de comunicación. Comunicación verbal oral",
            "Tipos de comunicación. Comunicación verbal escrita",
            "Tipos de comunicación. Comunicación no verbal",
            "La comunicación pública",
            "Técnicas de comunicación"] },
  { id: "estilismo", nombre: "Estilismo en vestuario y complementos",
    temas: ["La asesoría en estilismo",
            "El diseño de moda",
            "Protocolo de actuación en estilismo",
            "Historia de la moda. Prehistoria y Edad Antigua",
            "Historia de la moda. Edad Media y Renacimiento",
            "Historia de la moda. El Barroco y el Rococó"] },
  { id: "estetica", nombre: "Asesoría estética",
    temas: ["Introducción a la asesoría de estética y maquillaje",
            "Protocolo de trabajo de la asesoría en estética",
            "Estudio del cliente y fichas",
            "Fase de documentación y control de la propuesta",
            "Evaluación de la propuesta",
            "La piel"] },
  { id: "peluqueria", nombre: "Asesoría de peluquería",
    temas: ["Campos de actuación del asesor de imagen en peluquería",
            "Fase de documentación",
            "Estudio del cliente y su entorno",
            "Fase de propuesta personalizada. Presentación al cliente",
            "Análisis estético del cabello",
            "Análisis estético del cuero cabelludo"] },
  { id: "empleabilidad", nombre: "Itinerario personal para la empleabilidad I",
    temas: ["La prevención de riesgos en el entorno laboral",
            "Evaluación de riesgos en la empresa",
            "Tipos de daños profesionales. Accidentes y enfermedades en el trabajo",
            "Emergencias y primeros auxilios en el trabajo",
            "Oportunidades de empleo e inserción laboral",
            "Requerimientos exigidos para el empleo"] },
  { id: "ampliacion", nombre: "Ampliación de itinerario personal para la empleabilidad I",
    temas: ["Herramientas para mejorar la empleabilidad. Búsqueda de empleo",
            "Gestión personal del tiempo en el desempeño laboral. La productividad",
            "La gestión de proyectos",
            "¿Cómo hablar en público?",
            "Productos bancarios",
            "Matemáticas financieras"] }
];
