/**
 * Unit tests for Ruby (Gemfile) and PHP (composer.json) parsers
 */

import { describe, it, expect } from 'vitest';
import { parseGemfile } from '../../src/parsers/ruby';
import { parseComposerJson } from '../../src/parsers/php';

describe('parseGemfile', () => {
  it('parses gems with single quotes', () => {
    const gemfileContent = `gem 'rails', '~> 7.0'
gem 'pg', '>= 1.0'`;

    const result = parseGemfile(gemfileContent);
    expect(result).toEqual(['rails', 'pg']);
  });

  it('handles mixed quotes', () => {
    const gemfileContent = `gem "sinatra"
gem 'rack', '~> 2.0'`;

    const result = parseGemfile(gemfileContent);
    expect(result).toEqual(['sinatra', 'rack']);
  });

  it('returns empty array for no gems', () => {
    const gemfileContent = `source 'https://rubygems.org'`;

    const result = parseGemfile(gemfileContent);
    expect(result).toEqual([]);
  });
});

describe('parseComposerJson', () => {
  it('parses require section', () => {
    const composerContent = `{
  "require": {
    "laravel/framework": "^10.0",
    "guzzlehttp/guzzle": "^7.0"
  }
}`;

    const result = parseComposerJson(composerContent);
    expect(result).toEqual(['laravel/framework', 'guzzlehttp/guzzle']);
  });

  it('parses require-dev section', () => {
    const composerContent = `{
  "require-dev": {
    "phpunit/phpunit": "^10.0"
  }
}`;

    const result = parseComposerJson(composerContent);
    expect(result).toEqual(['phpunit/phpunit']);
  });

  it('filters out PHP version and extensions', () => {
    const composerContent = `{
  "require": {
    "php": "^8.2",
    "ext-mbstring": "*",
    "laravel/framework": "^10.0"
  }
}`;

    const result = parseComposerJson(composerContent);
    expect(result).toEqual(['laravel/framework']);
  });

  it('returns empty array for invalid JSON', () => {
    const composerContent = `{invalid json`;

    const result = parseComposerJson(composerContent);
    expect(result).toEqual([]);
  });
});
