import { describe, it, expect, beforeEach } from 'vitest';
import { autofillForm } from '../src/lib/autofill';

describe('Autofill Engine Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should auto-derive first name, last name, and email from profile when only full_name is present', () => {
    document.body.innerHTML = `
      <form id="jobApp">
        <div>
          <label for="first_name">First Name</label>
          <input type="text" id="first_name" name="first_name" />
        </div>
        <div>
          <label for="last_name">Last Name</label>
          <input type="text" id="last_name" name="last_name" />
        </div>
        <div>
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" />
        </div>
        <div>
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" />
        </div>
      </form>
    `;

    const profile = {
      name: 'Hardhik Rao Chidura',
      email: 'hardhikraochidura@gmail.com',
      phone: '+1 (845) 484-9588',
      location: 'Gillette, WY 82716, USA'
    };

    const filledCount = autofillForm(profile);
    expect(filledCount).toBe(4);

    const firstNameInput = document.getElementById('first_name') as HTMLInputElement;
    const lastNameInput = document.getElementById('last_name') as HTMLInputElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const phoneInput = document.getElementById('phone') as HTMLInputElement;

    expect(firstNameInput.value).toBe('Hardhik');
    expect(lastNameInput.value).toBe('Rao Chidura');
    expect(emailInput.value).toBe('hardhikraochidura@gmail.com');
    expect(phoneInput.value).toContain('845');
  });

  it('should correctly fill combined MM/YYYY date fields for work experience without leaving trailing incomplete month', () => {
    document.body.innerHTML = `
      <div data-automation-id="workExperience-1">
        <input type="text" name="company" placeholder="Company" />
        <input type="text" name="title" placeholder="Job Title" />
        <input type="text" id="startDate" name="from_date" placeholder="MM/YYYY" data-automation-id="startDate" />
        <input type="text" id="endDate" name="to_date" placeholder="MM/YYYY" data-automation-id="endDate" />
      </div>
    `;

    const profile = {
      name: 'Hardhik Rao',
      experience: [
        {
          company: 'Tech Corp',
          title: 'Senior Engineer',
          start_date: '01/2022',
          end_date: '07/2024'
        }
      ]
    };

    const filledCount = autofillForm(profile);
    expect(filledCount).toBe(4);

    const startInput = document.getElementById('startDate') as HTMLInputElement;
    const endInput = document.getElementById('endDate') as HTMLInputElement;

    // Must be complete MM/YYYY string, NOT just '01' or '07' which caused 'Invalid Date: 01/'
    expect(startInput.value).toBe('01/2022');
    expect(endInput.value).toBe('07/2024');
  });

  it('should auto-split compound location string into city, state, and zip code', () => {
    document.body.innerHTML = `
      <form id="addressForm">
        <input type="text" id="street" name="street_address" placeholder="Street Address" />
        <input type="text" id="city" name="city" placeholder="City" />
        <input type="text" id="state" name="state" placeholder="State" />
        <input type="text" id="zip" name="zip_code" placeholder="Postal Code" />
      </form>
    `;

    const profile = {
      full_name: 'Hardhik Rao',
      location: '123 Energy Ave, Gillette, WY 82716, USA'
    };

    const filledCount = autofillForm(profile);
    expect(filledCount).toBe(4);

    const streetInput = document.getElementById('street') as HTMLInputElement;
    const cityInput = document.getElementById('city') as HTMLInputElement;
    const stateInput = document.getElementById('state') as HTMLInputElement;
    const zipInput = document.getElementById('zip') as HTMLInputElement;

    expect(streetInput.value).toBe('123 Energy Ave');
    expect(cityInput.value).toBe('Gillette');
    expect(stateInput.value).toBe('WY');
    expect(zipInput.value).toBe('82716');
  });

  it('should auto-fill Workday automation IDs correctly', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" data-automation-id="legalNameSection_firstName" />
        <input type="text" data-automation-id="legalNameSection_lastName" />
        <input type="text" data-automation-id="email" />
        <input type="text" data-automation-id="phone-number" />
        <input type="text" data-automation-id="addressSection_city" />
      </form>
    `;

    const profile = {
      first_name: 'Varun',
      last_name: 'Kumar',
      email: 'varun@example.com',
      phone: '555-123-4567',
      city: 'Austin'
    };

    const filledCount = autofillForm(profile);
    expect(filledCount).toBe(5);

    const fn = document.querySelector('[data-automation-id="legalNameSection_firstName"]') as HTMLInputElement;
    const ln = document.querySelector('[data-automation-id="legalNameSection_lastName"]') as HTMLInputElement;
    const em = document.querySelector('[data-automation-id="email"]') as HTMLInputElement;

    expect(fn.value).toBe('Varun');
    expect(ln.value).toBe('Kumar');
    expect(em.value).toBe('varun@example.com');
  });

  it('should handle standard radio questions such as work authorization and sponsorship', () => {
    document.body.innerHTML = `
      <form>
        <div>
          <label>Are you legally authorized to work in the United States?</label>
          <input type="radio" name="auth" value="yes" id="auth_yes" />
          <input type="radio" name="auth" value="no" id="auth_no" />
        </div>
        <div>
          <label>Will you now or in the future require sponsorship for employment visa status?</label>
          <input type="radio" name="sponsorship" value="yes" id="spons_yes" />
          <input type="radio" name="sponsorship" value="no" id="spons_no" />
        </div>
      </form>
    `;

    const profile = {
      full_name: 'Hardhik Rao'
    };

    const filledCount = autofillForm(profile);
    expect(filledCount).toBe(2);

    const authYes = document.getElementById('auth_yes') as HTMLInputElement;
    const sponsNo = document.getElementById('spons_no') as HTMLInputElement;

    expect(authYes.checked).toBe(true);
    expect(sponsNo.checked).toBe(true);
  });
});
