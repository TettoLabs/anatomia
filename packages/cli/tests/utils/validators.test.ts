import { describe, it, expect } from 'vitest';
import { validateSlug, validateBranchName, validateSkillName, SLUG_PATTERN } from '../../src/utils/validators.js';

describe('validateSlug', () => {
  // @ana A003
  it('accepts valid kebab-case slugs', () => {
    expect(validateSlug('fix-auth-timeout')).toBe('fix-auth-timeout');
    expect(validateSlug('add-export-csv')).toBe('add-export-csv');
    expect(validateSlug('a')).toBe('a');
    expect(validateSlug('security-hardening')).toBe('security-hardening');
  });

  // @ana A004
  it('accepts slugs with numbers', () => {
    expect(validateSlug('fix-v2')).toBe('fix-v2');
    expect(validateSlug('add-export-v3')).toBe('add-export-v3');
    expect(validateSlug('v1')).toBe('v1');
  });

  // @ana A001
  it('rejects slug with shell metacharacters', () => {
    expect(() => validateSlug('foo; echo pwned')).toThrow('Invalid slug');
    expect(() => validateSlug('foo|bar')).toThrow('Invalid slug');
    expect(() => validateSlug('foo`whoami`')).toThrow('Invalid slug');
    expect(() => validateSlug('$(echo pwned)')).toThrow('Invalid slug');
    expect(() => validateSlug('foo\nbar')).toThrow('Invalid slug');
  });

  // @ana A002
  it('rejects slug with path traversal', () => {
    expect(() => validateSlug('../../../tmp')).toThrow('Invalid slug');
    expect(() => validateSlug('foo/../bar')).toThrow('Invalid slug');
    expect(() => validateSlug('..%2F..%2Ftmp')).toThrow('Invalid slug');
  });

  it('rejects empty string', () => {
    expect(() => validateSlug('')).toThrow('Invalid slug');
  });

  it('rejects uppercase', () => {
    expect(() => validateSlug('Fix-Auth')).toThrow('Invalid slug');
  });

  it('rejects double hyphens', () => {
    expect(() => validateSlug('fix--double')).toThrow('Invalid slug');
  });

  it('rejects leading/trailing hyphens', () => {
    expect(() => validateSlug('-leading')).toThrow('Invalid slug');
    expect(() => validateSlug('trailing-')).toThrow('Invalid slug');
  });

  it('exports SLUG_PATTERN regex', () => {
    expect(SLUG_PATTERN).toBeInstanceOf(RegExp);
    expect(SLUG_PATTERN.test('valid-slug')).toBe(true);
    expect(SLUG_PATTERN.test('INVALID')).toBe(false);
  });
});

describe('validateBranchName', () => {
  // @ana A006
  it('accepts valid branch names with slashes', () => {
    expect(validateBranchName('feature/my-branch')).toBe('feature/my-branch');
    expect(validateBranchName('origin/main')).toBe('origin/main');
    expect(validateBranchName('remotes/origin/main')).toBe('remotes/origin/main');
  });

  // @ana A007
  it('accepts empty string as branch prefix', () => {
    expect(validateBranchName('')).toBe('');
  });

  it('accepts branch names with dots and underscores', () => {
    expect(validateBranchName('release/v1.0.0')).toBe('release/v1.0.0');
    expect(validateBranchName('feature_branch')).toBe('feature_branch');
  });

  // @ana A005
  it('rejects branch name with shell metacharacters', () => {
    expect(() => validateBranchName('main; echo pwned')).toThrow('invalid');
    expect(() => validateBranchName('main|cat /etc/passwd')).toThrow('invalid');
    expect(() => validateBranchName('main`whoami`')).toThrow('invalid');
    expect(() => validateBranchName('$(echo pwned)')).toThrow('invalid');
    expect(() => validateBranchName('main\necho pwned')).toThrow('invalid');
  });
});

describe('validateSkillName', () => {
  // @ana A009
  it('accepts valid skill names', () => {
    expect(validateSkillName('coding-standards')).toBe('coding-standards');
    expect(validateSkillName('api-patterns')).toBe('api-patterns');
    expect(validateSkillName('git-workflow')).toBe('git-workflow');
    expect(validateSkillName('a')).toBe('a');
  });

  // @ana A008
  it('rejects skill name with shell metacharacters', () => {
    expect(() => validateSkillName('foo; echo pwned')).toThrow('invalid');
    expect(() => validateSkillName('foo|bar')).toThrow('invalid');
    expect(() => validateSkillName('foo`whoami`')).toThrow('invalid');
    expect(() => validateSkillName('$(echo pwned)')).toThrow('invalid');
    expect(() => validateSkillName('foo/bar')).toThrow('invalid');
  });

  it('rejects empty string', () => {
    expect(() => validateSkillName('')).toThrow('invalid');
  });
});
