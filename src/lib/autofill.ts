/**
 * ClipStaff Autofill Engine - Modular ATS filling module
 */

export function autofillForm(profile: any): number {
  const parseDateString = (dateStr: string) => {
    const clean = (dateStr || '').trim();
    if (!clean) return { month: '', monthNum: '', year: '' };
    const parts = clean.split(/[\s/,-]+/);
    let rawMonth = '';
    let rawYear = '';
    
    if (parts.length === 1) {
      rawYear = parts[0];
    } else if (parts[0].length === 4) {
      rawMonth = parts[1] || '';
      rawYear = parts[0];
    } else {
      rawMonth = parts[0] || '';
      rawYear = parts[1] || '';
    }
    
    let monthNum = rawMonth;
    const monthsMap: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };
    const cleanMonth = rawMonth.toLowerCase().replace(/[^a-z]/g, '');
    if (monthsMap[cleanMonth]) {
      monthNum = monthsMap[cleanMonth];
    } else if (/^\d+$/.test(rawMonth)) {
      monthNum = rawMonth.padStart(2, '0');
    }
    
    return { month: rawMonth, monthNum: monthNum, year: rawYear };
  };

  const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select, button[role="combobox"], div[role="combobox"]');
  let count = 0;

  // Repeating sections state trackers
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
    const id = (el.id || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const autocomplete = (el.autocomplete || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.title || '').toLowerCase();
    
    // Fetch label text via standard labels or aria-labelledby
    let labelsText = el.labels ? Array.from(el.labels).map((l: any) => l.textContent || '').join(' ').toLowerCase() : '';
    if (!labelsText) {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) labelsText = (labelEl.textContent || '').toLowerCase();
      }
    }
     if (!labelsText) {
       const formGroup = el.closest('div, tr, li, [class*="group"], [class*="field"], [class*="widget"]');
       if (formGroup) {
         const labeledSibling = formGroup.querySelector('[aria-labelledby], [aria-label]');
         if (labeledSibling) {
           const labelledBy = labeledSibling.getAttribute('aria-labelledby');
           if (labelledBy) {
             const labelEl = document.getElementById(labelledBy);
             if (labelEl) labelsText = (labelEl.textContent || '').toLowerCase();
           }
           if (!labelsText) {
             labelsText = (labeledSibling.getAttribute('aria-label') || '').toLowerCase();
           }
         }
       }
     }
     if (!labelsText) {
       let parent = el.parentElement;
       while (parent && !labelsText) {
         const labelEl = parent.querySelector('label');
         if (labelEl) {
           labelsText = (labelEl.textContent || '').toLowerCase();
           break;
         }
         parent = parent.parentElement;
       }
     }

    // Section contexts detection using preceding heading walker (compareDocumentPosition)
    let sectionText = '';
    const candidates = Array.from(document.querySelectorAll('*:not(input):not(textarea):not(select)'));
    const headings = candidates.filter((node: any) => {
      const text = (node.textContent || '').trim().toLowerCase();
      if (text.length === 0 || text.length > 50) return false;
      
      const isSectionHeader = 
        text.includes('education') || 
        text.includes('school') ||
        text.includes('academic') ||
        text.includes('experience') || 
        text.includes('work') || 
        text.includes('job') || 
        text.includes('employment') ||
        text.includes('history') ||
        text.includes('hear about us') ||
        text.includes('previously worked');
        
      if (isSectionHeader) {
        const hasDescendantHeader = node.querySelector('h1, h2, h3, h4, h5, h6, legend, [role="heading"]');
        return !hasDescendantHeader;
      }
      return false;
    });

    let lastHeadingBeforeEl = null;
    for (const h of headings) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        lastHeadingBeforeEl = h;
      } else {
        break;
      }
    }
    if (lastHeadingBeforeEl) {
      sectionText = (lastHeadingBeforeEl.textContent || '').toLowerCase();
    }

    const isUnderExperience = sectionText.includes('experience') || sectionText.includes('work') || sectionText.includes('job') || sectionText.includes('history');
    const isUnderEducation = sectionText.includes('education') || sectionText.includes('school') || sectionText.includes('academic') || sectionText.includes('study');

    // Page-level generic questions matching
    const isHearAboutUs = name.includes('hear') || id.includes('hear') || placeholder.includes('hear') || labelsText.includes('hear') || name.includes('source') || id.includes('source') || placeholder.includes('source') || labelsText.includes('source') || name.includes('referral') || id.includes('referral') || labelsText.includes('referral');
    const isPreviouslyWorked = name.includes('previously worked') || id.includes('previously worked') || labelsText.includes('previously worked') || name.includes('former employee') || id.includes('former employee') || labelsText.includes('former employee') || name.includes('prior employee') || id.includes('prior employee') || labelsText.includes('prior employee') || name.includes('worked at') || id.includes('worked at') || labelsText.includes('worked at') || name.includes('previously employed') || id.includes('previously employed') || labelsText.includes('previously employed') || name.includes('worked for') || id.includes('worked for') || labelsText.includes('worked for');

    let val = '';

    if (isHearAboutUs) {
      if (el.tagName === 'SELECT') {
        const options = Array.from(el.options || []);
        const indeedOption = options.find((opt: any) => (opt.text || '').toLowerCase().includes('indeed') || (opt.value || '').toLowerCase().includes('indeed')) as any;
        if (indeedOption) {
          val = indeedOption.value;
        }
      } else {
        val = 'Indeed';
      }
    } else if (isPreviouslyWorked) {
      if (el.tagName === 'SELECT') {
        const options = Array.from(el.options || []);
        const noOption = options.find((opt: any) => {
          const text = (opt.text || '').trim().toLowerCase();
          return text === 'no' || text === 'false' || text.startsWith('no ');
        }) as any;
        if (noOption) {
          val = noOption.value;
        }
      } else if (el.type === 'radio') {
        const isNoRadio = el.value.toLowerCase() === 'no' || el.value.toLowerCase() === 'false' || labelsText === 'no' || labelsText === 'false';
        if (isNoRadio) {
          el.checked = true;
          el.dispatchEvent(new Event('click', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }
        return;
      } else {
        val = 'No';
      }
    } else if (isUnderExperience) {
      // Work Experience repetir-section
      const experiences = profile.experience || [];
      
      const normText = (name + ' ' + id + ' ' + placeholder + ' ' + labelsText)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase();

      const isCompany = normText.includes('company') || normText.includes('employer');
      const isRole = (normText.includes('title') || normText.includes('role') || normText.includes('position') || normText.includes('job')) && !normText.includes('desc');
      const isDesc = normText.includes('description') || normText.includes('responsibilities') || el.tagName === 'TEXTAREA';
      const isLoc = normText.includes('location') || normText.includes('city');
      
      const isDate = normText.includes('date') || normText.includes('month') || normText.includes('year') || /\bfrom\b/i.test(normText) || /\bto\b/i.test(normText);
      const isStart = /\bstart\b/i.test(normText) || /\bfrom\b/i.test(normText);
      const isEnd = /\bend\b/i.test(normText) || /\bto\b/i.test(normText) || /\bpresent\b/i.test(normText);

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
        const isInputText = el.tagName === 'INPUT' && el.getAttribute('role') !== 'combobox';
        if (isStart) {
          if (experiences[expStartCount]) {
            const rawDate = experiences[expStartCount].start_date || '';
            const parsed = parseDateString(rawDate);
            if (normText.includes('month')) {
              val = isInputText ? parsed.monthNum : parsed.month;
            } else if (normText.includes('year')) {
              val = parsed.year;
              expStartCount++;
            } else {
              val = rawDate;
              expStartCount++;
            }
          }
        } else if (isEnd) {
          if (experiences[expEndCount]) {
            const rawDate = experiences[expEndCount].end_date || '';
            const parsed = parseDateString(rawDate);
            if (normText.includes('month')) {
              val = isInputText ? parsed.monthNum : parsed.month;
            } else if (normText.includes('year')) {
              val = parsed.year;
              expEndCount++;
            } else {
              val = rawDate;
              expEndCount++;
            }
          }
        } else {
          if (expStartCount === expEndCount && experiences[expStartCount]) {
            const rawDate = experiences[expStartCount].start_date || '';
            const parsed = parseDateString(rawDate);
            if (normText.includes('month')) {
              val = isInputText ? parsed.monthNum : parsed.month;
            } else if (normText.includes('year')) {
              val = parsed.year;
              expStartCount++;
            } else {
              val = rawDate;
              expStartCount++;
            }
          } else if (experiences[expEndCount]) {
            const rawDate = experiences[expEndCount].end_date || '';
            const parsed = parseDateString(rawDate);
            if (normText.includes('month')) {
              val = isInputText ? parsed.monthNum : parsed.month;
            } else if (normText.includes('year')) {
              val = parsed.year;
              expEndCount++;
            } else {
              val = rawDate;
              expEndCount++;
            }
          }
        }
      }
    } else if (isUnderEducation) {
      // Education repetir-section
      const educations = profile.education || [];

      const normText = (name + ' ' + id + ' ' + placeholder + ' ' + labelsText)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase();

      const isSchool = normText.includes('school') || normText.includes('university') || normText.includes('college') || normText.includes('institution');
      const isDegree = normText.includes('degree') && !normText.includes('study') && !normText.includes('major');
      const isFieldOfStudy = normText.includes('study') || normText.includes('major') || normText.includes('program');
      const isLoc = normText.includes('location') || normText.includes('city') || normText.includes('town');
      const isDate = normText.includes('date') || normText.includes('year') || /\bfrom\b/i.test(normText) || /\bto\b/i.test(normText);
      const isStart = /\bstart\b/i.test(normText) || /\bfrom\b/i.test(normText);
      const isEnd = /\bend\b/i.test(normText) || /\bto\b/i.test(normText) || /\bpresent\b/i.test(normText) || /\bgrad\b/i.test(normText) || /\bgraduation\b/i.test(normText);

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
      const isInputText = el.tagName === 'INPUT' && el.getAttribute('role') !== 'combobox';
      if (isStart) {
        if (educations[eduStartCount]) {
          const rawDate = educations[eduStartCount].start_year || '';
          const parsed = parseDateString(rawDate);
          if (normText.includes('month')) {
            val = isInputText ? parsed.monthNum : parsed.month;
          } else if (normText.includes('year')) {
            val = parsed.year;
            eduStartCount++;
          } else {
            val = rawDate;
            eduStartCount++;
          }
        }
      } else if (isEnd) {
        if (educations[eduEndCount]) {
          const rawDate = educations[eduEndCount].end_year || '';
          const parsed = parseDateString(rawDate);
          if (normText.includes('month')) {
            val = isInputText ? parsed.monthNum : parsed.month;
          } else if (normText.includes('year')) {
            val = parsed.year;
            eduEndCount++;
          } else {
            val = rawDate;
            eduEndCount++;
          }
        }
      } else {
        if (eduStartCount === eduEndCount && educations[eduStartCount]) {
          const rawDate = educations[eduStartCount].start_year || '';
          const parsed = parseDateString(rawDate);
          if (normText.includes('month')) {
            val = isInputText ? parsed.monthNum : parsed.month;
          } else if (normText.includes('year')) {
            val = parsed.year;
            eduStartCount++;
          } else {
            val = rawDate;
            eduStartCount++;
          }
        } else if (educations[eduEndCount]) {
          const rawDate = educations[eduEndCount].end_year || '';
          const parsed = parseDateString(rawDate);
          if (normText.includes('month')) {
            val = isInputText ? parsed.monthNum : parsed.month;
          } else if (normText.includes('year')) {
            val = parsed.year;
            eduEndCount++;
          } else {
            val = rawDate;
            eduEndCount++;
          }
        }
      }
      }
    } else {
      // Personal details
      const isEmail = name.includes('email') || id.includes('email') || autocomplete.includes('email') || el.type === 'email' || placeholder.includes('email') || ariaLabel.includes('email') || title.includes('email') || labelsText.includes('email');
      const isPhone = name.includes('phone') || id.includes('phone') || name.includes('mobile') || id.includes('mobile') || el.type === 'tel' || placeholder.includes('phone') || placeholder.includes('mobile') || ariaLabel.includes('phone') || ariaLabel.includes('mobile') || title.includes('phone') || title.includes('mobile') || labelsText.includes('phone') || labelsText.includes('mobile');
      
      const isFirstName = name.includes('firstname') || name.includes('first_name') || name.includes('fname') || name.includes('first') || name === 'f_name' || id.includes('firstname') || id.includes('first_name') || id.includes('fname') || id.includes('first') || placeholder.includes('first name') || placeholder.includes('given name') || autocomplete.includes('given-name') || ariaLabel.includes('first name') || ariaLabel.includes('given name') || title.includes('first name') || labelsText.includes('first name') || labelsText.includes('given name');
      const isMiddleName = name.includes('middlename') || name.includes('middle_name') || name.includes('mname') || name.includes('middle') || id.includes('middlename') || id.includes('middle_name') || id.includes('mname') || placeholder.includes('middle name') || autocomplete.includes('additional-name') || ariaLabel.includes('middle name') || title.includes('middle name') || labelsText.includes('middle name');
      const isLastName = name.includes('lastname') || name.includes('last_name') || name.includes('lname') || name.includes('last') || name === 'l_name' || id.includes('lastname') || id.includes('last_name') || id.includes('lname') || id.includes('last') || placeholder.includes('last name') || placeholder.includes('family name') || placeholder.includes('surname') || autocomplete.includes('family-name') || ariaLabel.includes('last name') || ariaLabel.includes('family name') || ariaLabel.includes('surname') || title.includes('last name') || title.includes('family name') || title.includes('surname') || labelsText.includes('last name') || labelsText.includes('family name') || labelsText.includes('surname');
      
      const isStreetAddress = name.includes('street') || name.includes('address') || name.includes('addr') || id.includes('street') || id.includes('address') || id.includes('addr') || placeholder.includes('street') || placeholder.includes('address') || placeholder.includes('addr') || autocomplete.includes('address-line') || autocomplete.includes('street-address') || ariaLabel.includes('street') || ariaLabel.includes('address') || title.includes('street') || title.includes('address') || labelsText.includes('street') || labelsText.includes('address');
      const isCity = name.includes('city') || id.includes('city') || placeholder.includes('city') || placeholder.includes('town') || autocomplete.includes('address-level2') || name.includes('town') || id.includes('town') || ariaLabel.includes('city') || ariaLabel.includes('town') || title.includes('city') || labelsText.includes('city') || labelsText.includes('town');
      const isState = name.includes('state') || id.includes('state') || name.includes('province') || id.includes('province') || placeholder.includes('state') || placeholder.includes('province') || autocomplete.includes('address-level1') || ariaLabel.includes('state') || ariaLabel.includes('province') || title.includes('state') || title.includes('province') || labelsText.includes('state') || labelsText.includes('province');
      const isPinCode = name.includes('pincode') || name.includes('zip') || name.includes('postal') || id.includes('pincode') || id.includes('zip') || id.includes('postal') || placeholder.includes('pin code') || placeholder.includes('zip') || placeholder.includes('postal') || autocomplete.includes('postal-code') || ariaLabel.includes('pincode') || ariaLabel.includes('zip') || ariaLabel.includes('postal') || title.includes('pincode') || title.includes('zip') || title.includes('postal') || labelsText.includes('pincode') || labelsText.includes('zip') || labelsText.includes('postal');
      
      const isLinkedIn = name.includes('linkedin') || id.includes('linkedin') || placeholder.includes('linkedin');
      const isPortfolio = name.includes('portfolio') || id.includes('portfolio') || name.includes('website') || id.includes('website') || placeholder.includes('portfolio') || placeholder.includes('website');
      
      const isFullName = name.includes('fullname') || name.includes('full_name') || id.includes('fullname') || id.includes('full_name') || placeholder.includes('full name') || ariaLabel.includes('full name') || title.includes('full name') || labelsText.includes('full name') || ( (name.includes('name') || id.includes('name') || placeholder.includes('name') || labelsText.includes('name')) && !isFirstName && !isMiddleName && !isLastName && !name.includes('company') && !name.includes('university') && !name.includes('school') && !name.includes('username') && !name.includes('user') && !name.includes('login') && !id.includes('username') && !id.includes('user') && !id.includes('login') );
      const isLocation = name.includes('location') || id.includes('location') || placeholder.includes('location');
      const isTitle = name.includes('title') || id.includes('title') || placeholder.includes('title') || name.includes('headline') || id.includes('headline');

      if (isEmail) {
        val = profile.email || '';
      } else if (isPhone) {
        val = profile.phone || '';
      } else if (isFirstName) {
        val = profile.first_name || '';
      } else if (isMiddleName) {
        val = profile.middle_name || '';
      } else if (isLastName) {
        val = profile.last_name || '';
      } else if (isFullName) {
        val = profile.full_name || '';
      } else if (isLinkedIn) {
        val = profile.linkedin_url || '';
      } else if (isPortfolio) {
        val = profile.portfolio_url || '';
      } else if (isStreetAddress) {
        val = profile.street_address || '';
      } else if (isCity) {
        val = profile.city || '';
      } else if (isState) {
        val = profile.state || '';
      } else if (isPinCode) {
        val = profile.pin_code || '';
      } else if (isLocation) {
        val = profile.location || '';
      } else if (isTitle) {
        val = profile.professional_subtitle || '';
      }
    }

    if (val && val.trim()) {
      el.focus();
      
      const isCombobox = el.getAttribute('role') === 'combobox' || 
                         el.hasAttribute('aria-haspopup') || 
                         el.tagName === 'BUTTON' || 
                         el.closest('[role="combobox"], [data-automation-id="decorationSelectWidget"]');
      
      if (el.tagName === 'SELECT') {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (isCombobox) {
        // Workday Custom Combobox/Select handling
        const trigger = el.tagName === 'INPUT' || el.tagName === 'BUTTON' ? el : (el.querySelector('input:not([type="hidden"]), button') || el);
        
        if (trigger.tagName === 'INPUT') {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(trigger, val);
          } else {
            trigger.value = val;
          }
          trigger.dispatchEvent(new Event('input', { bubbles: true }));
          trigger.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        trigger.click();
        trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        let attempts = 0;
         const selectOption = () => {
           const options = Array.from(document.querySelectorAll('[role="option"], .menu-item, [id*="option"]'));
           let targetOption = options.find((opt: any) => {
             const text = (opt.textContent || '').trim().toLowerCase();
             return text.includes(val.toLowerCase()) || val.toLowerCase().includes(text);
           }) as any;
           
           if (!targetOption && options.length > 0) {
             targetOption = options[0];
           }
           
           if (targetOption) {
             targetOption.click();
             targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
           } else if (attempts < 5) {
             attempts++;
             setTimeout(selectOption, 100);
           } else {
             trigger.click();
           }
         };
         setTimeout(selectOption, 100);
      } else {
        // Trigger React/Angular synthetic change trackers
        const nativeSetter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeSetter) {
          nativeSetter.call(el, val);
        } else {
          el.value = val;
        }
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      el.blur();
      count++;
    }
  });

  return count;
}
