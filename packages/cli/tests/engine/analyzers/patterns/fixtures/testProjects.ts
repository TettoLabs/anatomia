/**
 * Test projects for pattern detection accuracy validation
 *
 * 30 real open-source projects with ground truth labeling
 * URLs documented for future real validation in CI/CD
 *
 * NOTE: For CP4 implementation, tests use mock data.
 * Real accuracy validation requires cloning these repos.
 */

export interface TestProject {
  name: string;
  url: string;
  language: 'python' | 'node' | 'go' | 'rust';
  framework: string;
  description: string;
  expected: {
    validation?: string;
    validationVariant?: string;
    database?: string;
    databaseVariant?: string;
    auth?: string;
    testing?: string;
    errorHandling?: string;
  };
}

export const testProjects: TestProject[] = [
  // ===== PYTHON PROJECTS (10) =====

  // FastAPI projects (5)
  {
    name: 'fastapi-users',
    url: 'https://github.com/fastapi-users/fastapi-users',
    language: 'python',
    framework: 'fastapi',
    description: 'FastAPI authentication library',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      databaseVariant: 'async',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'fastapi-realworld',
    url: 'https://github.com/nsidnev/fastapi-realworld-example-app',
    language: 'python',
    framework: 'fastapi',
    description: 'RealWorld example app',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      databaseVariant: 'async',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'sqlmodel',
    url: 'https://github.com/tiangolo/sqlmodel',
    language: 'python',
    framework: 'fastapi',
    description: 'SQLModel library',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'fastapi-boilerplate',
    url: 'https://github.com/teamhide/fastapi-boilerplate',
    language: 'python',
    framework: 'fastapi',
    description: 'Production FastAPI template',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      databaseVariant: 'async',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'full-stack-fastapi',
    url: 'https://github.com/tiangolo/full-stack-fastapi-template',
    language: 'python',
    framework: 'fastapi',
    description: 'Full-stack FastAPI template',
    expected: {
      validation: 'pydantic',
      database: 'sqlalchemy',
      databaseVariant: 'async',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },

  // Django projects (3)
  {
    name: 'django-rest-framework',
    url: 'https://github.com/encode/django-rest-framework',
    language: 'python',
    framework: 'django',
    description: 'Django REST Framework',
    expected: {
      validation: 'drf-serializers',
      database: 'django-orm',
      auth: 'django-auth',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'django-realworld',
    url: 'https://github.com/gothinkster/django-realworld-example-app',
    language: 'python',
    framework: 'django',
    description: 'RealWorld with Django',
    expected: {
      validation: 'drf-serializers',
      database: 'django-orm',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'django-ecommerce',
    url: 'https://github.com/justdjango/django-ecommerce',
    language: 'python',
    framework: 'django',
    description: 'Django e-commerce',
    expected: {
      database: 'django-orm',
      auth: 'django-auth',
      testing: 'unittest',
      errorHandling: 'exceptions',
    }
  },

  // Flask projects (2)
  {
    name: 'flask-realworld',
    url: 'https://github.com/gothinkster/flask-realworld-example-app',
    language: 'python',
    framework: 'flask',
    description: 'RealWorld with Flask',
    expected: {
      database: 'sqlalchemy',
      databaseVariant: 'sync',
      auth: 'jwt',
      testing: 'pytest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'flasky',
    url: 'https://github.com/miguelgrinberg/flasky',
    language: 'python',
    framework: 'flask',
    description: 'Flask web development',
    expected: {
      database: 'sqlalchemy',
      databaseVariant: 'sync',
      testing: 'unittest',
      errorHandling: 'exceptions',
    }
  },

  // ===== NODE.JS PROJECTS (10) =====

  // Next.js projects (4)
  {
    name: 'nextjs-commerce',
    url: 'https://github.com/vercel/commerce',
    language: 'node',
    framework: 'nextjs',
    description: 'Next.js Commerce',
    expected: {
      validation: 'zod',
      database: 'prisma',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'nextjs-clerk',
    url: 'https://github.com/clerk/clerk-nextjs-example',
    language: 'node',
    framework: 'nextjs',
    description: 'Next.js with Clerk',
    expected: {
      validation: 'zod',
      auth: 'clerk',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'nextjs-subscription',
    url: 'https://github.com/vercel/nextjs-subscription-payments',
    language: 'node',
    framework: 'nextjs',
    description: 'Next.js subscription payments',
    expected: {
      validation: 'zod',
      database: 'prisma',
      auth: 'next-auth',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'nextjs-blog',
    url: 'https://github.com/vercel/next.js/tree/canary/examples/blog',
    language: 'node',
    framework: 'nextjs',
    description: 'Next.js blog example',
    expected: {
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },

  // Express projects (3)
  {
    name: 'express-realworld',
    url: 'https://github.com/gothinkster/node-express-realworld-example-app',
    language: 'node',
    framework: 'express',
    description: 'RealWorld with Express',
    expected: {
      validation: 'joi',
      database: 'typeorm',
      auth: 'jwt',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'express-typescript-2024',
    url: 'https://github.com/edwinhern/express-typescript-2024',
    language: 'node',
    framework: 'express',
    description: 'Modern Express TypeScript',
    expected: {
      validation: 'zod',
      database: 'prisma',
      auth: 'jwt',
      testing: 'vitest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'express-boilerplate',
    url: 'https://github.com/hagopj13/node-express-boilerplate',
    language: 'node',
    framework: 'express',
    description: 'Express production boilerplate',
    expected: {
      validation: 'joi',
      database: 'prisma',
      auth: 'jwt',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },

  // NestJS projects (2)
  {
    name: 'nestjs-realworld',
    url: 'https://github.com/lujakob/nestjs-realworld-example-app',
    language: 'node',
    framework: 'nestjs',
    description: 'RealWorld with NestJS',
    expected: {
      validation: 'class-validator',
      database: 'typeorm',
      auth: 'jwt',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },
  {
    name: 'nestjs-prisma',
    url: 'https://github.com/notiz-dev/nestjs-prisma-starter',
    language: 'node',
    framework: 'nestjs',
    description: 'NestJS with Prisma',
    expected: {
      validation: 'class-validator',
      database: 'prisma',
      auth: 'jwt',
      testing: 'jest',
      errorHandling: 'exceptions',
    }
  },

  // Vanilla Node (1)
  {
    name: 'node-api-design',
    url: 'https://github.com/scottmoss/node-api-design',
    language: 'node',
    framework: 'express',
    description: 'Node API design patterns',
    expected: {
      validation: 'joi',
      testing: 'mocha',
      errorHandling: 'exceptions',
    }
  },

  // ===== GO PROJECTS (5) =====

  {
    name: 'gin-realworld',
    url: 'https://github.com/gothinkster/golang-gin-realworld-example-app',
    language: 'go',
    framework: 'gin',
    description: 'RealWorld with Gin',
    expected: {
      validation: 'go-playground-validator',
      database: 'gorm',
      auth: 'jwt',
      testing: 'go-test',
      errorHandling: 'error-returns',
    }
  },
  {
    name: 'gin-boilerplate',
    url: 'https://github.com/Massad/gin-boilerplate',
    language: 'go',
    framework: 'gin',
    description: 'Gin production boilerplate',
    expected: {
      validation: 'go-playground-validator',
      database: 'gorm',
      auth: 'jwt',
      testing: 'go-test',
      errorHandling: 'error-returns',
    }
  },
  {
    name: 'go-rest-api',
    url: 'https://github.com/qiangxue/golang-restful-starter-kit',
    language: 'go',
    framework: 'stdlib',
    description: 'Go REST API',
    expected: {
      validation: 'go-playground-validator',
      database: 'gorm',
      auth: 'jwt',
      testing: 'go-test',
      errorHandling: 'error-returns',
    }
  },
  {
    name: 'go-web-app',
    url: 'https://github.com/astaxie/build-web-application-with-golang',
    language: 'go',
    framework: 'stdlib',
    description: 'Building web apps with Go',
    expected: {
      testing: 'go-test',
      errorHandling: 'error-returns',
    }
  },
  {
    name: 'echo-realworld',
    url: 'https://github.com/xesina/golang-echo-realworld-example-app',
    language: 'go',
    framework: 'echo',
    description: 'RealWorld with Echo',
    expected: {
      validation: 'go-playground-validator',
      database: 'gorm',
      auth: 'jwt',
      testing: 'go-test',
      errorHandling: 'error-returns',
    }
  },

  // ===== RUST PROJECTS (5) =====

  {
    name: 'axum-realworld',
    url: 'https://github.com/launchbadge/realworld-axum-sqlx',
    language: 'rust',
    framework: 'axum',
    description: 'RealWorld with Axum',
    expected: {
      testing: 'rust-test',
      errorHandling: 'result-type',
    }
  },
  {
    name: 'actix-realworld',
    url: 'https://github.com/fairingrey/actix-realworld-example-app',
    language: 'rust',
    framework: 'actix-web',
    description: 'RealWorld with Actix-web',
    expected: {
      testing: 'rust-test',
      errorHandling: 'result-type',
    }
  },
  {
    name: 'rocket-realworld',
    url: 'https://github.com/TatriX/realworld-rust-rocket',
    language: 'rust',
    framework: 'rocket',
    description: 'RealWorld with Rocket',
    expected: {
      testing: 'rust-test',
      errorHandling: 'result-type',
    }
  },
  {
    name: 'axum-example',
    url: 'https://github.com/tokio-rs/axum/tree/main/examples',
    language: 'rust',
    framework: 'axum',
    description: 'Axum official examples',
    expected: {
      testing: 'rust-test',
      errorHandling: 'result-type',
    }
  },
  {
    name: 'actix-example',
    url: 'https://github.com/actix/examples',
    language: 'rust',
    framework: 'actix-web',
    description: 'Actix-web examples',
    expected: {
      testing: 'rust-test',
      errorHandling: 'result-type',
    }
  },
];
