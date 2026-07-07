import { describe, it, expect } from 'vitest';
import { getPlaceholders, resolveTemplate } from './templateHelper';
import { Profile } from '../types';

describe('templateHelper: getPlaceholders', () => {
  it('should parse unique placeholder tags correctly', () => {
    const text = 'Hello {{full_name}}, your email is {{email}} and we love {{company}}!';
    const tags = getPlaceholders(text);
    expect(tags).toEqual(['full_name', 'email', 'company']);
  });

  it('should handle whitespace inside tags', () => {
    const text = 'Hi {{  first_name   }} and {{lastName}}';
    const tags = getPlaceholders(text);
    expect(tags).toEqual(['first_name', 'lastname']);
  });

  it('should return empty list when no tags are present', () => {
    expect(getPlaceholders('Simple string without braces')).toEqual([]);
  });
});

describe('templateHelper: resolveTemplate', () => {
  const mockProfile: Partial<Profile> = {
    full_name: 'Jane Doe',
    first_name: 'Jane',
    email: 'jane@example.com',
    phone: '123-456-7890',
    linkedin_url: 'https://linkedin.com/in/janedoe',
  };

  it('should replace profile static placeholders correctly', () => {
    const text = 'Name: {{full_name}}, Phone: {{phone}}, Mail: {{email}}';
    const { resolvedText, unresolved } = resolveTemplate(text, mockProfile);

    expect(resolvedText).toBe('Name: Jane Doe, Phone: 123-456-7890, Mail: jane@example.com');
    expect(unresolved).toEqual([]);
  });

  it('should default missing profile variables to empty string', () => {
    const text = 'Website: {{portfolio_url}}';
    const { resolvedText, unresolved } = resolveTemplate(text, mockProfile);

    expect(resolvedText).toBe('Website: ');
    expect(unresolved).toEqual([]);
  });

  it('should resolve metadata company and role from URL', () => {
    const text = 'Applying to {{company}} for {{role}} role';
    const url = 'https://careers.netflix.com/jobs/senior-react-engineer';
    const { resolvedText, unresolved } = resolveTemplate(text, mockProfile, url);

    expect(resolvedText).toBe('Applying to Netflix for Senior React Engineer role');
    expect(unresolved).toEqual([]);
  });

  it('should return custom parameters in unresolved list', () => {
    const text = 'Hi {{full_name}}, I want to schedule a call on {{date}} at {{time}}';
    const { resolvedText, unresolved } = resolveTemplate(text, mockProfile);

    expect(resolvedText).toContain('Jane Doe');
    expect(unresolved).toEqual(['date', 'time']);
  });
});
