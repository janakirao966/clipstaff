import { describe, it, expect } from 'vitest';
import { 
  parseResumePlainText, 
  splitCompanyAndLocation, 
  parseContent, 
  parseExperiencesFromResumeText 
} from '../src/lib/resumeParser';
import { generateDocxBlob } from '../src/lib/exporters';

describe('CVCraft Modern ATS Resume Engine & Parser', () => {
  const samplePlainTextResume = `
Alexander Morgan
Senior Controls & Automation Engineer
Dallas, TX | +1 (555) 019-2834 | alex.morgan@email.com | linkedin.com/in/alexmorgan

[PROFESSIONAL SUMMARY]
Controls and Automation Engineer with 7+ years of experience engineering automated manufacturing systems using Studio 5000, Ignition SCADA, and Python across automotive and aerospace environments. Reduced system commissioning downtime by 35% through standardized PLC modular architecture.

[TECHNICAL SKILLS]
PLC & Automation: Allen-Bradley ControlLogix, Siemens S7-1500, TIA Portal, Studio 5000
SCADA & HMI: Ignition, FactoryTalk View SE/ME, Wonderware System Platform
Languages & DB: Python, Structured Text, Ladder Logic, SQL, C#
Industrial Networks: EtherNet/IP, Profinet, Modbus TCP/IP, OPC UA

[PROFESSIONAL EXPERIENCE]
Tesla Motors — Austin, TX | Senior Controls Engineer | 03/2022 – Present
- Architected PLC logic for battery pack assembly lines utilizing Studio 5000 and Safety GuardLogix controllers.
- Engineered real-time Ignition SCADA telemetry dashboards tracking 120+ active line metrics with sub-second latency.
- Integrated 18 Fanuc 6-axis robotic cells over EtherNet/IP, decreasing cycle time by 4.2 seconds per unit.

Boeing — Seattle, WA | Controls Engineer | 06/2019 – 02/2022
- Developed and tested safety interlock PLC routines for automated riveting gantries adhering to OSHA standards.
- Standardized factory-wide Allen-Bradley add-on instructions (AOIs) reducing new machine integration time by 25%.

[TECHNICAL PROJECTS]
Automated SCADA Fleet Telemetry | Python, Ignition | https://github.com/alexmorgan/scada-telemetry
- Engineered distributed MQTT broker pipeline handling 10,000 tag writes per second.
- Deployed Grafana visualizations for real-time robotic cell temperature monitoring.

[EDUCATION]
Bachelor of Science in Electrical Engineering | Purdue University | 05/2019 | West Lafayette, IN

[CERTIFICATIONS]
- Certified Automation Professional (CAP) — ISA
- Ignition 8.1 Core Certified — Inductive Automation
`;

  it('should accurately parse header information', () => {
    const data = parseResumePlainText(samplePlainTextResume);
    expect(data.name).toBe('Alexander Morgan');
    expect(data.subtitle).toBe('Senior Controls & Automation Engineer');
    expect(data.location).toBe('Dallas, TX');
    expect(data.phone).toBe('+1 (555) 019-2834');
    expect(data.email).toBe('alex.morgan@email.com');
    expect(data.linkedin).toBe('linkedin.com/in/alexmorgan');
  });

  it('should accurately parse professional summary and technical skills categories', () => {
    const data = parseResumePlainText(samplePlainTextResume);
    expect(data.summary).toContain('Controls and Automation Engineer with 7+ years of experience');
    expect(data.skills).toHaveLength(4);
    expect(data.skills[0].category).toBe('PLC & Automation');
    expect(data.skills[0].list).toContain('Allen-Bradley ControlLogix');
    expect(data.skills[2].category).toBe('Languages & DB');
    expect(data.skills[2].list).toContain('Python');
  });

  it('should accurately parse professional experience with separated company, location, role, and dates', () => {
    const data = parseResumePlainText(samplePlainTextResume);
    expect(data.experience).toHaveLength(2);

    const tesla = data.experience[0];
    expect(tesla.company).toBe('Tesla Motors');
    expect(tesla.location).toBe('Austin, TX');
    expect(tesla.role).toBe('Senior Controls Engineer');
    expect(tesla.dates).toBe('03/2022 – Present');
    expect(tesla.bullets).toHaveLength(3);
    expect(tesla.bullets[0]).toContain('Architected PLC logic');

    const boeing = data.experience[1];
    expect(boeing.company).toBe('Boeing');
    expect(boeing.location).toBe('Seattle, WA');
    expect(boeing.role).toBe('Controls Engineer');
    expect(boeing.dates).toBe('06/2019 – 02/2022');
    expect(boeing.bullets).toHaveLength(2);
  });

  it('should accurately parse technical projects, repository links, and bullets', () => {
    const data = parseResumePlainText(samplePlainTextResume);
    expect(data.projects).toHaveLength(1);

    const proj = data.projects[0];
    expect(proj.name).toBe('Automated SCADA Fleet Telemetry');
    expect(proj.tech).toBe('Python, Ignition');
    expect(proj.link).toBe('https://github.com/alexmorgan/scada-telemetry');
    expect(proj.bullets).toHaveLength(2);
    expect(proj.bullets[0]).toContain('MQTT broker pipeline');
  });

  it('should accurately parse education and certifications', () => {
    const data = parseResumePlainText(samplePlainTextResume);
    expect(data.education).toHaveLength(1);
    expect(data.education[0].degree).toBe('Bachelor of Science in Electrical Engineering');
    expect(data.education[0].school).toBe('Purdue University');
    expect(data.education[0].dates).toBe('05/2019');
    expect(data.education[0].location).toBe('West Lafayette, IN');

    expect(data.certs).toHaveLength(2);
    expect(data.certs[0]).toContain('Certified Automation Professional (CAP)');
    expect(data.certs[1]).toContain('Ignition 8.1 Core Certified');
  });

  it('should correctly split company and location for various formats', () => {
    expect(splitCompanyAndLocation('Tesla Motors — Austin, TX')).toEqual({
      company: 'Tesla Motors',
      location: 'Austin, TX'
    });
    expect(splitCompanyAndLocation('Amazon, Seattle, WA')).toEqual({
      company: 'Amazon',
      location: 'Seattle, WA'
    });
    expect(splitCompanyAndLocation('Microsoft Corporation')).toEqual({
      company: 'Microsoft Corporation',
      location: ''
    });
  });

  it('should generate valid OpenXML Word Document (.docx) Blob', async () => {
    const data = parseResumePlainText(samplePlainTextResume);
    const docxBlob = await generateDocxBlob(data, 'serif');
    expect(docxBlob).toBeInstanceOf(Blob);
    expect(docxBlob.size).toBeGreaterThan(1000);
    expect(docxBlob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('should maintain backward compatibility for legacy parser functions', () => {
    const legacy = parseContent(samplePlainTextResume);
    expect(legacy.summary).toContain('Controls and Automation Engineer');
    expect(legacy.skills).toContain('Allen-Bradley');
    expect(legacy.experience).toContain('Tesla Motors');

    const expList = parseExperiencesFromResumeText(samplePlainTextResume);
    expect(expList.length).toBeGreaterThan(0);
    expect(expList[0].company).toBe('Tesla Motors');
    expect(expList[0].title).toBe('Senior Controls Engineer');
  });
});
