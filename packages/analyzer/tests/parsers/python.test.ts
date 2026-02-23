import { describe, it, expect } from 'vitest';
import { parseRequirementsTxt } from '../../src/parsers/python/requirements';
import { parsePyprojectToml } from '../../src/parsers/python/pyproject';
import { parsePipfile } from '../../src/parsers/python/Pipfile';

describe('parseRequirementsTxt', () => {
  it('parses simple dependencies', () => {
    const content = 'flask==2.0.1\ndjango>=3.0';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['flask', 'django']);
  });

  it('handles comments at start of line', () => {
    const content = '# comment\nflask==2.0';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['flask']);
  });

  it('handles inline comments', () => {
    const content = 'flask==2.0 # web framework';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['flask']);
  });

  it('handles extras in brackets', () => {
    const content = 'requests[security]>=2.0';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['requests']);
  });

  it('handles environment markers', () => {
    const content = 'pytest>=7.0; python_version >= "3.8"';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['pytest']);
  });

  it('skips option lines starting with dash', () => {
    const content = '-e git+https://github.com/example/repo.git\nflask';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['flask']);
  });

  it('handles blank lines', () => {
    const content = 'flask\n\n\ndjango';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['flask', 'django']);
  });

  it('normalizes case to lowercase', () => {
    const content = 'Django==3.0\nFLASK==2.0';
    const result = parseRequirementsTxt(content);
    expect(result).toEqual(['django', 'flask']);
  });
});

describe('parsePyprojectToml', () => {
  it('parses PEP 621 format', () => {
    const content = `[project]
dependencies = ["fastapi>=0.100.0", "uvicorn>=0.20.0"]`;
    const result = parsePyprojectToml(content);
    expect(result).toEqual(['fastapi', 'uvicorn']);
  });

  it('parses Poetry format and skips python version', () => {
    const content = `[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.100.0"`;
    const result = parsePyprojectToml(content);
    expect(result).toEqual(['fastapi']);
  });

  it('parses Poetry dev dependencies', () => {
    const content = `[tool.poetry.group.dev.dependencies]
pytest = "^7.0"`;
    const result = parsePyprojectToml(content);
    expect(result).toEqual(['pytest']);
  });

  it('returns empty array for invalid TOML', () => {
    const content = 'invalid{toml';
    const result = parsePyprojectToml(content);
    expect(result).toEqual([]);
  });
});

describe('parsePipfile', () => {
  it('parses packages section', () => {
    const content = `[packages]
flask = "*"
sqlalchemy = ">=1.4"`;
    const result = parsePipfile(content);
    expect(result).toEqual(['flask', 'sqlalchemy']);
  });

  it('parses dev-packages section', () => {
    const content = `[dev-packages]
pytest = "*"`;
    const result = parsePipfile(content);
    expect(result).toEqual(['pytest']);
  });

  it('handles empty Pipfile', () => {
    const content = '[packages]';
    const result = parsePipfile(content);
    expect(result).toEqual([]);
  });
});
