/**
 * ClipStaff Industrial-Grade ATS Autofill Engine
 * Full coverage for Workday, Greenhouse, Lever, SmartRecruiters, Ashby, Taleo, iCIMS, SuccessFactors, LinkedIn, and generic ATS portals.
 */

export function autofillForm(profile: any, isReRun = false): number {
  if (!profile) return 0;

  // Derive smart name components
  const rawFullName = (profile.full_name || profile.name || '').trim();
  const nameParts = rawFullName ? rawFullName.split(/\s+/) : [];
  const firstName = profile.first_name || nameParts[0] || '';
  const middleName = profile.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');
  const lastName = profile.last_name || (nameParts.length > 1 ? (profile.middle_name ? nameParts[nameParts.length - 1] : nameParts.slice(1).join(' ')) : '') || '';
  const fullName = rawFullName || [firstName, middleName, lastName].filter(Boolean).join(' ');

  // Derive smart location / address components
  const rawLocation = (profile.location || profile.street_address || '').trim();
  let streetAddress = profile.street_address || '';
  let city = profile.city || '';
  let state = profile.state || '';
  let pinCode = profile.pin_code || '';

  if ((!city || !state || !pinCode) && rawLocation) {
    // Attempt parsing "City, ST 12345, USA" or "123 Main St, City, ST 12345"
    const locParts = rawLocation.split(',').map((p: string) => p.trim());
    if (locParts.length >= 3) {
      if (!streetAddress && locParts.length === 4) streetAddress = locParts[0];
      if (!city) city = locParts[locParts.length - 3] || locParts[0];
      const stateZip = locParts[locParts.length - 2] || '';
      const szMatch = stateZip.match(/([a-zA-Z\s]+)\s+(\d{5}(-\d{4})?|[a-zA-Z0-9]{3}\s?[a-zA-Z0-9]{3})/);
      if (szMatch) {
        if (!state) state = szMatch[1].trim();
        if (!pinCode) pinCode = szMatch[2].trim();
      } else if (!state) {
        state = stateZip;
      }
    } else if (locParts.length === 2) {
      if (!city) city = locParts[0];
      if (!state) state = locParts[1];
    }
  }

  // Parse phone variations
  const rawPhone = (profile.phone || '').trim();
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  const usPhone10 = cleanPhoneDigits.length === 11 && cleanPhoneDigits.startsWith('1') 
    ? cleanPhoneDigits.substring(1) 
    : cleanPhoneDigits;
  const formattedUsPhone = usPhone10.length === 10 
    ? `(${usPhone10.substring(0, 3)}) ${usPhone10.substring(3, 6)}-${usPhone10.substring(6)}`
    : rawPhone;

  // Robust date parser for all ATS formats
  const parseDateString = (dateStr: string) => {
    const clean = (dateStr || '').trim();
    if (!clean) {
      return { 
        month: '', 
        monthNum: '', 
        year: '', 
        formattedMMYYYY: '', 
        formattedYYYYMM: '', 
        formattedMMDDYYYY: '', 
        isPresent: false 
      };
    }

    const isPresent = /present|current|now/i.test(clean);
    if (isPresent) {
      const now = new Date();
      const curYear = String(now.getFullYear());
      const curMonthNum = String(now.getMonth() + 1).padStart(2, '0');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const curMonthName = monthNames[now.getMonth()];
      return {
        month: curMonthName,
        monthNum: curMonthNum,
        year: curYear,
        formattedMMYYYY: `${curMonthNum}/${curYear}`,
        formattedYYYYMM: `${curYear}-${curMonthNum}`,
        formattedMMDDYYYY: `${curMonthNum}/01/${curYear}`,
        isPresent: true
      };
    }

    const monthsMap: Record<string, { num: string; name: string }> = {
      jan: { num: '01', name: 'January' }, january: { num: '01', name: 'January' },
      feb: { num: '02', name: 'February' }, february: { num: '02', name: 'February' },
      mar: { num: '03', name: 'March' }, march: { num: '03', name: 'March' },
      apr: { num: '04', name: 'April' }, april: { num: '04', name: 'April' },
      may: { num: '05', name: 'May' },
      jun: { num: '06', name: 'June' }, june: { num: '06', name: 'June' },
      jul: { num: '07', name: 'July' }, july: { num: '07', name: 'July' },
      aug: { num: '08', name: 'August' }, august: { num: '08', name: 'August' },
      sep: { num: '09', name: 'September' }, september: { num: '09', name: 'September' },
      oct: { num: '10', name: 'October' }, october: { num: '10', name: 'October' },
      nov: { num: '11', name: 'November' }, november: { num: '11', name: 'November' },
      dec: { num: '12', name: 'December' }, december: { num: '12', name: 'December' }
    };

    let rawYear = '';
    let monthNum = '01';
    let monthName = 'January';

    // 1. Check for 4 digit year
    const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      rawYear = yearMatch[1];
    }

    // 2. Check for textual month (e.g. Jan 2022 or January 2022)
    const textMonthMatch = clean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
    if (textMonthMatch) {
      const key = textMonthMatch[1].toLowerCase();
      if (monthsMap[key]) {
        monthNum = monthsMap[key].num;
        monthName = monthsMap[key].name;
      }
    } else {
      // 3. Check numeric month (e.g. 01/2022 or 2022-01)
      const parts = clean.split(/[\s/,-]+/);
      if (parts.length >= 2) {
        if (parts[0].length === 4) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) {
            monthNum = String(m).padStart(2, '0');
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            monthName = monthNames[m - 1] || 'January';
          }
        } else {
          const m = parseInt(parts[0], 10);
          if (m >= 1 && m <= 12) {
            monthNum = String(m).padStart(2, '0');
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            monthName = monthNames[m - 1] || 'January';
          }
        }
      }
    }

    if (!rawYear) {
      rawYear = String(new Date().getFullYear());
    }

    return {
      month: monthName,
      monthNum: monthNum,
      year: rawYear,
      formattedMMYYYY: `${monthNum}/${rawYear}`,
      formattedYYYYMM: `${rawYear}-${monthNum}`,
      formattedMMDDYYYY: `${monthNum}/01/${rawYear}`,
      isPresent: false
    };
  };

  // Select all candidate interactive elements
  // Recursive collector supporting standard DOM and Shadow DOM components
  const collectAllInputs = (root: Document | ShadowRoot | HTMLElement): HTMLElement[] => {
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select, [role="combobox"], [data-automation-id*="SelectWidget"], [data-automation-id*="input"], [data-automation-id*="text"]';
    let results = Array.from(root.querySelectorAll<HTMLElement>(selector));
    
    // Discover nested open Shadow Roots
    const allElements = Array.from(root.querySelectorAll<HTMLElement>('*'));
    allElements.forEach(el => {
      if (el.shadowRoot) {
        results = results.concat(collectAllInputs(el.shadowRoot));
      }
    });
    
    return results;
  };

  const inputs = collectAllInputs(document);

  let count = 0;

  // Work experience & education repeating tracker indices
  let companyCount = 0;
  let titleCount = 0;
  let descCount = 0;
  let expLocationCount = 0;
  let expStartCount = 0;
  let expEndCount = 0;

  let schoolCount = 0;
  let degreeCount = 0;
  let majorCount = 0;
  let eduLocationCount = 0;
  let eduStartCount = 0;
  let eduEndCount = 0;

  inputs.forEach((el: any) => {
    // If it is a dynamic re-run, skip already filled fields to avoid overwriting typed content
    if (isReRun && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
      if (el.value && el.value.trim() !== '') {
        return;
      }
    }

    const id = (el.id || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const autocomplete = (el.autocomplete || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.title || '').toLowerCase();
    const autoId = (el.getAttribute('data-automation-id') || el.getAttribute('data-test') || el.getAttribute('data-qa') || '').toLowerCase();
    
    // Fetch label text via standard labels or aria-labelledby
    let labelsText = el.labels ? Array.from(el.labels).map((l: any) => l.textContent || '').join(' ').toLowerCase() : '';
    if (!labelsText) {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) labelsText = (labelEl.textContent || '').toLowerCase();
      }
    }
    const formGroup = el.closest('div, tr, li, [class*="group"], [class*="field"], [class*="widget"], [class*="form-item"]');
    if (!labelsText && formGroup) {
      const labeledSibling = formGroup.querySelector('label, [aria-labelledby], [aria-label], [class*="label"]');
      if (labeledSibling) {
        labelsText = (labeledSibling.textContent || labeledSibling.getAttribute('aria-label') || '').toLowerCase();
      }
    }

    // Identify Scoped Sections (Experience vs Education vs Personal Info)
    const sectionScope = el.closest('fieldset, [data-automation-id*="workExperience"], [data-automation-id*="education"], [data-automation-id*="experience"], section, [id*="experience"], [id*="education"], [class*="experience"], [class*="education"]');
    const scopeText = sectionScope ? (sectionScope.getAttribute('data-automation-id') || sectionScope.getAttribute('id') || sectionScope.className || sectionScope.querySelector('legend, h2, h3, h4')?.textContent || '').toLowerCase() : '';

    const isUnderExperience = scopeText.includes('experience') || scopeText.includes('work') || scopeText.includes('job') || scopeText.includes('employment') || autoId.includes('workexperience') || id.includes('work_experience');
    const isUnderEducation = scopeText.includes('education') || scopeText.includes('school') || scopeText.includes('academic') || scopeText.includes('study') || autoId.includes('education') || id.includes('education');

    // Consolidated matching metadata tokens
    const allMeta = `${name} ${id} ${placeholder} ${autoId} ${ariaLabel} ${title} ${labelsText} ${autocomplete}`.toLowerCase();

    // Checkbox / Radio Agreement or Question Handler
    if (el.type === 'checkbox') {
      const isConsent = allMeta.includes('agree') || allMeta.includes('consent') || allMeta.includes('terms') || allMeta.includes('privacy') || allMeta.includes('acknowledge');
      if (isConsent && !el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('click', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
        return;
      }
    }

    if (el.type === 'radio') {
      const isAuthorizedQuestion = allMeta.includes('authorized') || allMeta.includes('eligibility') || allMeta.includes('legal right') || allMeta.includes('legally authorized');
      const isSponsorshipQuestion = allMeta.includes('sponsorship') || allMeta.includes('require visa') || allMeta.includes('visa sponsorship');
      const isPriorEmployeeQuestion = allMeta.includes('previously worked') || allMeta.includes('former employee') || allMeta.includes('prior employee');

      let targetChoice: 'yes' | 'no' | null = null;
      if (isAuthorizedQuestion) targetChoice = 'yes';
      if (isSponsorshipQuestion) targetChoice = 'no';
      if (isPriorEmployeeQuestion) targetChoice = 'no';

      if (targetChoice) {
        const valStr = (el.value || labelsText).trim().toLowerCase();
        const matchesTarget = (targetChoice === 'yes' && (valStr === 'yes' || valStr === 'true' || valStr === '1')) ||
                              (targetChoice === 'no' && (valStr === 'no' || valStr === 'false' || valStr === '0'));
        if (matchesTarget && !el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('click', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
          return;
        }
      }
    }

    let val = '';

    // ==========================================
    // 1. REPEATING SECTIONS: WORK EXPERIENCE
    // ==========================================
    if (isUnderExperience) {
      const experiences = profile.experience || [];
      const isCompany = allMeta.includes('company') || allMeta.includes('employer') || autoId.includes('company');
      const isRole = (allMeta.includes('title') || allMeta.includes('role') || allMeta.includes('position') || allMeta.includes('job title')) && !allMeta.includes('description');
      const isDesc = allMeta.includes('description') || allMeta.includes('responsibilities') || allMeta.includes('summary') || el.tagName === 'TEXTAREA';
      const isLoc = (allMeta.includes('location') || allMeta.includes('city')) && !allMeta.includes('school');
      
      const isDate = allMeta.includes('date') || allMeta.includes('month') || allMeta.includes('year') || /\bfrom\b/.test(allMeta) || /\bto\b/.test(allMeta);
      const isStart = /\bstart\b|\bfrom\b|startdate|fromdate/i.test(allMeta) || autoId.includes('startdate');
      const isEnd = /\bend\b|\bto\b|enddate|todate/i.test(allMeta) || autoId.includes('enddate');

      if (isCompany && experiences[companyCount]) {
        val = experiences[companyCount].company || '';
        companyCount++;
      } else if (isRole && experiences[titleCount]) {
        val = experiences[titleCount].title || '';
        titleCount++;
      } else if (isDesc && experiences[descCount]) {
        val = experiences[descCount].description || '';
        descCount++;
      } else if (isLoc && experiences[expLocationCount]) {
        val = experiences[expLocationCount].location || '';
        expLocationCount++;
      } else if (isDate) {
        // Disambiguate Month-only, Year-only, and Combined MM/YYYY fields
        const isExplicitMonthOnly = (
          autoId.includes('datesectionmonth') ||
          autoId.includes('month-display') ||
          id.endsWith('month') || 
          name.endsWith('month') || 
          placeholder === 'mm' || 
          placeholder === 'month' ||
          ariaLabel === 'month' ||
          labelsText === 'month'
        ) && !placeholder.includes('yyyy') && !placeholder.includes('/') && !allMeta.includes('mm/yyyy');

        const isExplicitYearOnly = (
          autoId.includes('datesectionyear') ||
          autoId.includes('year-display') ||
          id.endsWith('year') || 
          name.endsWith('year') || 
          placeholder === 'yyyy' || 
          placeholder === 'year' ||
          ariaLabel === 'year' ||
          labelsText === 'year'
        ) && !placeholder.includes('mm') && !placeholder.includes('/') && !allMeta.includes('mm/yyyy');

        if (isStart && experiences[expStartCount]) {
          const rawDate = experiences[expStartCount].start_date || '';
          const parsed = parseDateString(rawDate);

          if (isExplicitMonthOnly) {
            val = el.tagName === 'SELECT' ? parsed.month : parsed.monthNum;
          } else if (isExplicitYearOnly) {
            val = parsed.year;
            expStartCount++;
          } else {
            // Combined Date Input (e.g. Workday MM/YYYY or HTML5 month/date)
            if (el.type === 'month') {
              val = parsed.formattedYYYYMM;
            } else if (el.type === 'date' || placeholder.includes('dd') || placeholder.includes('mm/dd/yyyy')) {
              val = parsed.formattedMMDDYYYY;
            } else {
              val = parsed.formattedMMYYYY;
            }
            expStartCount++;
          }
        } else if (isEnd && experiences[expEndCount]) {
          const rawDate = experiences[expEndCount].end_date || '';
          const parsed = parseDateString(rawDate);

          // Handle "Currently Working Here" checkbox
          if (parsed.isPresent) {
            const currCheckbox = formGroup?.querySelector('input[type="checkbox"]') || 
                                 sectionScope?.querySelector('input[type="checkbox"][data-automation-id*="current"], input[type="checkbox"][id*="current"], input[type="checkbox"][name*="current"]');
            if (currCheckbox && !(currCheckbox as HTMLInputElement).checked) {
              (currCheckbox as HTMLInputElement).checked = true;
              currCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
              currCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          if (isExplicitMonthOnly) {
            val = el.tagName === 'SELECT' ? parsed.month : parsed.monthNum;
          } else if (isExplicitYearOnly) {
            val = parsed.year;
            expEndCount++;
          } else {
            // Combined Date Input
            if (el.type === 'month') {
              val = parsed.formattedYYYYMM;
            } else if (el.type === 'date' || placeholder.includes('dd') || placeholder.includes('mm/dd/yyyy')) {
              val = parsed.formattedMMDDYYYY;
            } else {
              val = parsed.formattedMMYYYY;
            }
            expEndCount++;
          }
        }
      }
    }
    // ==========================================
    // 2. REPEATING SECTIONS: EDUCATION
    // ==========================================
    else if (isUnderEducation) {
      const educations = profile.education || [];
      const isSchool = allMeta.includes('school') || allMeta.includes('university') || allMeta.includes('college') || allMeta.includes('institution') || autoId.includes('school');
      const isDegree = (allMeta.includes('degree') || autoId.includes('degree')) && !allMeta.includes('study') && !allMeta.includes('major');
      const isFieldOfStudy = allMeta.includes('study') || allMeta.includes('major') || allMeta.includes('discipline') || allMeta.includes('program') || autoId.includes('fieldofstudy');
      const isLoc = (allMeta.includes('location') || allMeta.includes('city')) && !allMeta.includes('company');
      const isDate = allMeta.includes('date') || allMeta.includes('year') || allMeta.includes('grad') || allMeta.includes('month');

      if (isSchool && educations[schoolCount]) {
        val = educations[schoolCount].school || '';
        schoolCount++;
      } else if (isDegree && educations[degreeCount]) {
        val = educations[degreeCount].degree || '';
        degreeCount++;
      } else if (isFieldOfStudy && educations[majorCount]) {
        val = educations[majorCount].field_of_study || '';
        majorCount++;
      } else if (isLoc && educations[eduLocationCount]) {
        val = educations[eduLocationCount].location || '';
        eduLocationCount++;
      } else if (isDate) {
        const isStart = /\bstart\b|\bfrom\b/i.test(allMeta);
        const isExplicitMonth = (
          autoId.includes('datesectionmonth') ||
          autoId.includes('month-display') ||
          id.endsWith('month') || 
          name.endsWith('month') || 
          placeholder === 'mm' || 
          placeholder === 'month'
        ) && !placeholder.includes('yyyy') && !placeholder.includes('/');

        if (isStart && educations[eduStartCount]) {
          const rawDate = educations[eduStartCount].start_year || '';
          const parsed = parseDateString(rawDate);
          if (isExplicitMonth) {
            val = el.tagName === 'SELECT' ? parsed.month : parsed.monthNum;
          } else if (allMeta.includes('mm/yyyy') || placeholder.includes('yyyy')) {
            val = parsed.formattedMMYYYY || parsed.year;
            eduStartCount++;
          } else {
            val = parsed.year || rawDate;
            eduStartCount++;
          }
        } else if (educations[eduEndCount]) {
          const rawDate = educations[eduEndCount].end_year || '';
          const parsed = parseDateString(rawDate);
          if (isExplicitMonth) {
            val = el.tagName === 'SELECT' ? parsed.month : parsed.monthNum;
          } else if (allMeta.includes('mm/yyyy') || placeholder.includes('yyyy')) {
            val = parsed.formattedMMYYYY || parsed.year;
            eduEndCount++;
          } else {
            val = parsed.year || rawDate;
            eduEndCount++;
          }
        }
      }
    }
    // ==========================================
    // 3. CANDIDATE PROFILE CORE FIELDS
    // ==========================================
    else {
      const isEmail = allMeta.includes('email') || autocomplete.includes('email') || autoId.includes('email') || el.type === 'email';
      const isPhone = (allMeta.includes('phone') || allMeta.includes('mobile') || allMeta.includes('tel') || autocomplete.includes('tel') || autoId.includes('phone')) && !allMeta.includes('device');
      
      const isFirstName = (allMeta.includes('first') && allMeta.includes('name')) || allMeta.includes('fname') || allMeta.includes('givenname') || autocomplete.includes('given-name') || autoId.includes('firstname') || autoId.includes('legalnamesection_firstname') || id === 'first_name' || name === 'first_name';
      const isMiddleName = (allMeta.includes('middle') && allMeta.includes('name')) || allMeta.includes('mname') || autocomplete.includes('additional-name') || autoId.includes('middlename');
      const isLastName = (allMeta.includes('last') && allMeta.includes('name')) || (allMeta.includes('sur') && allMeta.includes('name')) || (allMeta.includes('family') && allMeta.includes('name')) || allMeta.includes('lname') || autocomplete.includes('family-name') || autoId.includes('lastname') || autoId.includes('legalnamesection_lastname') || id === 'last_name' || name === 'last_name';
      
      const isFullName = (allMeta.includes('full') && allMeta.includes('name')) || (allMeta.includes('name') && !isFirstName && !isMiddleName && !isLastName && !allMeta.includes('company') && !allMeta.includes('school') && !allMeta.includes('user') && !allMeta.includes('file'));

      const isStreetAddress = (allMeta.includes('street') || allMeta.includes('address line 1') || allMeta.includes('address1') || allMeta.includes('addressline1') || autoId.includes('addressline1') || autocomplete.includes('address-line1')) && !allMeta.includes('email');
      const isCity = allMeta.includes('city') || allMeta.includes('town') || allMeta.includes('municipality') || autocomplete.includes('address-level2') || autoId.includes('city');
      const isState = (allMeta.includes('state') || allMeta.includes('province') || allMeta.includes('region') || autocomplete.includes('address-level1') || autoId.includes('state') || autoId.includes('province')) && !allMeta.includes('united states');
      const isPinCode = allMeta.includes('pincode') || allMeta.includes('zip') || allMeta.includes('postal') || autocomplete.includes('postal-code') || autoId.includes('postalcode') || autoId.includes('zip');
      
      const isLinkedIn = allMeta.includes('linkedin') || allMeta.includes('linked in') || autoId.includes('linkedin');
      const isPortfolio = allMeta.includes('portfolio') || allMeta.includes('website') || allMeta.includes('github') || allMeta.includes('url') || autoId.includes('portfolio');
      const isLocation = (allMeta.includes('location') || allMeta.includes('address')) && !isStreetAddress && !isCity && !isState && !isPinCode && !isEmail;
      const isTitle = allMeta.includes('title') || allMeta.includes('headline') || allMeta.includes('subtitle') || autoId.includes('title');

      const isHearAboutUs = allMeta.includes('hear') || allMeta.includes('referral') || allMeta.includes('source') || autoId.includes('source');
      const isPreviouslyWorked = allMeta.includes('previously worked') || allMeta.includes('former employee') || allMeta.includes('prior employee') || allMeta.includes('worked for') || autoId.includes('previouslyworked');

      if (isEmail) {
        val = profile.email || '';
      } else if (isPhone) {
        val = allMeta.includes('format') ? formattedUsPhone : (profile.phone || usPhone10);
      } else if (isFirstName) {
        val = firstName;
      } else if (isMiddleName) {
        val = middleName;
      } else if (isLastName) {
        val = lastName;
      } else if (isFullName) {
        val = fullName;
      } else if (isLinkedIn) {
        val = profile.linkedin_url || profile.linkedin || '';
      } else if (isPortfolio) {
        val = profile.portfolio_url || profile.portfolio || profile.website || '';
      } else if (isStreetAddress) {
        val = streetAddress || profile.street_address || profile.location || '';
      } else if (isCity) {
        val = city;
      } else if (isState) {
        val = state;
      } else if (isPinCode) {
        val = pinCode;
      } else if (isLocation) {
        val = profile.location || streetAddress || [city, state].filter(Boolean).join(', ');
      } else if (isTitle) {
        val = profile.professional_subtitle || profile.title || '';
      } else if (isHearAboutUs) {
        val = 'Indeed';
      } else if (isPreviouslyWorked) {
        val = 'No';
      }
    }

    // Apply populated value to element safely
    if (val && String(val).trim()) {
      const finalVal = String(val).trim();
      el.focus();
      
      const isCombobox = el.getAttribute('role') === 'combobox' || 
                         el.hasAttribute('aria-haspopup') || 
                         el.tagName === 'BUTTON' || 
                         el.closest('[role="combobox"], [data-automation-id*="SelectWidget"]');
      
      if (el.tagName === 'SELECT') {
        const options = Array.from((el as HTMLSelectElement).options);
        const normVal = finalVal.toLowerCase();
        
        // Match option by text, value, or state abbreviation
        let matchingOpt = options.find(opt => {
          const optText = (opt.text || '').trim().toLowerCase();
          const optVal = (opt.value || '').trim().toLowerCase();
          return optText === normVal || optVal === normVal || optText.includes(normVal) || (normVal.length > 3 && optText.startsWith(normVal.slice(0, 3)));
        });

        if (matchingOpt) {
          (el as HTMLSelectElement).value = matchingOpt.value;
        } else {
          (el as HTMLSelectElement).value = finalVal;
        }
        
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (isCombobox) {
        const trigger = el.tagName === 'INPUT' || el.tagName === 'BUTTON' ? el : (el.querySelector('input:not([type="hidden"]), button') || el);
        
        if (trigger.tagName === 'INPUT') {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeSetter) nativeSetter.call(trigger, finalVal);
          else trigger.value = finalVal;
          trigger.dispatchEvent(new Event('input', { bubbles: true }));
          trigger.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        trigger.click();
        
        let attempts = 0;
        const selectOption = () => {
          const options = Array.from(document.querySelectorAll('[role="option"], .menu-item, [id*="option"], [data-automation-id*="promptOption"]'));
          const normVal = finalVal.toLowerCase();
          let targetOption = options.find((opt: any) => {
            const text = (opt.textContent || '').trim().toLowerCase();
            return text === normVal || text.includes(normVal) || normVal.includes(text);
          }) as any;
          
          if (!targetOption && options.length > 0) {
            targetOption = options[0];
          }
          
          if (targetOption) {
            targetOption.click();
            targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          } else if (attempts < 4) {
            attempts++;
            setTimeout(selectOption, 100);
          }
        };
        setTimeout(selectOption, 100);
      } else {
        // Standard Text / Textarea input
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        
        if (nativeSetter) {
          nativeSetter.call(el, finalVal);
        } else {
          el.value = finalVal;
        }

        // Framework synthetic trackers (React 16+, Vue, Angular)
        const tracker = (el as any)._valueTracker;
        if (tracker) {
          tracker.setValue(finalVal);
        }
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof InputEvent !== 'undefined') {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: finalVal }));
        }
      }
      
      el.blur();
      count++;
    }
  });

  return count;
}
