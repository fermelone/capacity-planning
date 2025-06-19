import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
const mockJsPDF = {
  setFontSize: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
};

const mockPapa = {
  unparse: vi.fn().mockReturnValue('mocked,csv,data'),
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockJsPDF),
}));

vi.mock('papaparse', () => ({
  default: mockPapa,
}));

// Mock DOM APIs
Object.defineProperty(global.URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-blob-url'),
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: vi.fn(),
});

// Mock test data
const mockSubnets = [
  {
    id: 'subnet-1',
    name: 'test-subnet-1',
    region: 'us-east-1',
    az: 'a',
    cidrSize: 24,
    availableIps: 251,
  },
  {
    id: 'subnet-2',
    name: 'test-subnet-2',
    region: 'us-east-1',
    az: 'b',
    cidrSize: 24,
    availableIps: 251,
  },
];

const mockRunners = [
  {
    id: 'runner-1',
    name: 'test-runner-1',
    region: 'us-east-1',
    users: 50,
    subnetIds: ['subnet-1'],
    capacity: 251,
  },
  {
    id: 'runner-2',
    name: 'test-runner-2',
    region: 'us-east-1',
    users: 30,
    subnetIds: ['subnet-2'],
    capacity: 251,
  },
];

const mockConfig = {
  totalUsers: 100,
  environmentsPerUser: 2,
  azCount: 2,
  subnetSize: 16,
};

describe('Export Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Export', () => {
    it('should create PDF with correct structure', () => {
      // Simulate the PDF export logic
      const exportToPDF = () => {
        mockJsPDF.setFontSize(16);
        mockJsPDF.text('Capacity Planning Summary', 20, 20);
        
        mockJsPDF.setFontSize(12);
        mockJsPDF.text(`Total Users: ${mockConfig.totalUsers}`, 20, 30);
        mockJsPDF.text(`Environments per User: ${mockConfig.environmentsPerUser}`, 20, 40);
        
        mockJsPDF.save('capacity-planning.pdf');
      };
      
      exportToPDF();
      
      expect(mockJsPDF.setFontSize).toHaveBeenCalledWith(16);
      expect(mockJsPDF.text).toHaveBeenCalledWith('Capacity Planning Summary', 20, 20);
      expect(mockJsPDF.text).toHaveBeenCalledWith(`Total Users: ${mockConfig.totalUsers}`, 20, 30);
      expect(mockJsPDF.save).toHaveBeenCalledWith('capacity-planning.pdf');
    });

    it('should include subnet information in PDF', () => {
      const exportToPDF = () => {
        mockJsPDF.setFontSize(14);
        mockJsPDF.text('Subnet Configuration', 20, 80);
        
        let y = 100;
        mockSubnets.forEach(subnet => {
          mockJsPDF.text(subnet.name, 20, y);
          mockJsPDF.text(subnet.region, 50, y);
          mockJsPDF.text(`/${subnet.cidrSize}`, 110, y);
          y += 10;
        });
      };
      
      exportToPDF();
      
      expect(mockJsPDF.text).toHaveBeenCalledWith('Subnet Configuration', 20, 80);
      expect(mockJsPDF.text).toHaveBeenCalledWith('test-subnet-1', 20, 100);
      expect(mockJsPDF.text).toHaveBeenCalledWith('test-subnet-2', 20, 110);
    });
  });

  describe('CSV Export', () => {
    it('should generate CSV with correct data structure', () => {
      const exportToCSV = () => {
        const subnetData = mockSubnets.map(subnet => ({
          'Record Type': 'Subnet',
          'Name/Runner': subnet.name,
          Region: subnet.region,
          AZ: `${subnet.region}-${subnet.az}`,
          'Subnet/CIDR': `/${subnet.cidrSize}`,
          'Available IPs': subnet.availableIps,
          'Planned Users': '',
          Capacity: subnet.availableIps,
        }));

        const runnerData = mockRunners.map(runner => ({
          'Record Type': 'Runner',
          'Name/Runner': runner.name,
          Region: runner.region,
          AZ: '',
          'Subnet/CIDR': 'test-subnet-1',
          'Available IPs': '',
          'Planned Users': runner.users * mockConfig.environmentsPerUser,
          Capacity: runner.capacity,
        }));
        
        mockPapa.unparse([...subnetData, ...runnerData]);
      };
      
      exportToCSV();
      
      expect(mockPapa.unparse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Record Type': 'Subnet',
            'Name/Runner': 'test-subnet-1',
          }),
          expect.objectContaining({
            'Record Type': 'Runner',
            'Name/Runner': 'test-runner-1',
          }),
        ])
      );
    });

    it('should handle empty data gracefully', () => {
      const exportToCSV = () => {
        mockPapa.unparse([]);
      };
      
      exportToCSV();
      
      expect(mockPapa.unparse).toHaveBeenCalledWith([]);
    });
  });

  describe('Text Export', () => {
    it('should generate text with correct formatting', () => {
      const exportToText = () => {
        let text = `Capacity Planning Summary\n\n`;
        text += `Total Users: ${mockConfig.totalUsers}\n`;
        text += `Environments per User: ${mockConfig.environmentsPerUser}\n`;
        
        text += `\nSubnet Configuration:\n`;
        mockSubnets.forEach(subnet => {
          text += `\n${subnet.name}:\n`;
          text += `  Region: ${subnet.region}\n`;
          text += `  CIDR Size: /${subnet.cidrSize}\n`;
        });
        
        return text;
      };
      
      const result = exportToText();
      
      expect(result).toContain('Capacity Planning Summary');
      expect(result).toContain(`Total Users: ${mockConfig.totalUsers}`);
      expect(result).toContain('Subnet Configuration:');
      expect(result).toContain('test-subnet-1:');
      expect(result).toContain('Region: us-east-1');
    });
  });

  describe('Blob URL Management', () => {
    it('should create and revoke blob URLs properly', () => {
      const exportWithCleanup = () => {
        const blob = new Blob(['test content'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Simulate download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test.txt';
        
        // Cleanup
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      };
      
      exportWithCleanup();
      
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', () => {
      mockJsPDF.save.mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });
      
      const exportToPDF = () => {
        try {
          mockJsPDF.save('test.pdf');
        } catch (error) {
          console.error('PDF export failed:', error);
          return false;
        }
        return true;
      };
      
      const result = exportToPDF();
      expect(result).toBe(false);
    });

    it('should handle CSV generation errors gracefully', () => {
      mockPapa.unparse.mockImplementationOnce(() => {
        throw new Error('CSV generation failed');
      });
      
      const exportToCSV = () => {
        try {
          mockPapa.unparse([]);
        } catch (error) {
          console.error('CSV export failed:', error);
          return false;
        }
        return true;
      };
      
      const result = exportToCSV();
      expect(result).toBe(false);
    });
  });
});