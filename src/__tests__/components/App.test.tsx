import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils/render-helpers';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window.location.search
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/capacity-planning',
        search: '',
        href: 'https://example.com/capacity-planning'
      },
      writable: true
    });
  });

  describe('Initial Render', () => {
    it('should render the main title', () => {
      render(<App />);
      expect(screen.getByText('Gitpod Flex Capacity Planning')).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      render(<App />);
      
      expect(screen.getByText('Environment calculation')).toBeInTheDocument();
      expect(screen.getByText('Network configuration')).toBeInTheDocument();
      expect(screen.getByText('AWS Regions')).toBeInTheDocument();
    });

    it('should have default values in inputs', () => {
      render(<App />);
      
      const userInput = screen.getByDisplayValue('10');
      const envInput = screen.getByDisplayValue('1');
      
      expect(userInput).toBeInTheDocument();
      expect(envInput).toBeInTheDocument();
    });
  });

  describe('User Inputs', () => {
    it('should update total users when input changes', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const userInput = screen.getByDisplayValue('10');
      await user.clear(userInput);
      await user.type(userInput, '50');
      
      expect(userInput).toHaveValue(50);
    });

    it('should validate user input constraints', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const userInput = screen.getByDisplayValue('10');
      
      // Test upper bound
      await user.clear(userInput);
      await user.type(userInput, '100000');
      expect(userInput).toHaveValue(99999);
      
      // Test lower bound
      await user.clear(userInput);
      await user.type(userInput, '0');
      expect(userInput).toHaveValue(1);
    });

    it('should update environments per user', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const envInput = screen.getByDisplayValue('1');
      await user.clear(envInput);
      await user.type(envInput, '3');
      
      expect(envInput).toHaveValue(3);
    });
  });

  describe('Region Selection', () => {
    it('should allow selecting AWS regions', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      expect(usEastCheckbox).toBeChecked();
    });

    it('should show subnet configuration when regions are selected', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('VPC Subnet Configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Subnet Management', () => {
    it('should add subnet when button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // First select a region
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        const addSubnetButton = screen.getByText('Add Subnet');
        expect(addSubnetButton).toBeInTheDocument();
      });
      
      const addSubnetButton = screen.getByText('Add Subnet');
      await user.click(addSubnetButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('subnet-1')).toBeInTheDocument();
      });
    });
  });

  describe('Runner Configuration', () => {
    it('should show runner configuration when subnets exist', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Select region and add subnet
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        const addSubnetButton = screen.getByText('Add Subnet');
        return user.click(addSubnetButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Runner Configuration')).toBeInTheDocument();
      });
    });

    it('should add runner when button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Setup: select region and add subnet
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        const addSubnetButton = screen.getByText('Add Subnet');
        return user.click(addSubnetButton);
      });
      
      await waitFor(() => {
        const addRunnerButton = screen.getByText('Add Runner');
        return user.click(addRunnerButton);
      });
      
      await waitFor(() => {
        const runnerInputs = screen.getAllByDisplayValue(/Runner \d+/);
        expect(runnerInputs.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Export Functionality', () => {
    it('should show export buttons when configuration is complete', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Setup complete configuration
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        const addSubnetButton = screen.getByText('Add Subnet');
        return user.click(addSubnetButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Warnings', () => {
    it('should show warning for over-allocated users', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Set total users to 10
      const userInput = screen.getByDisplayValue('10');
      await user.clear(userInput);
      await user.type(userInput, '10');
      
      // Setup infrastructure
      const usEastCheckbox = screen.getByLabelText('US East (N. Virginia)');
      await user.click(usEastCheckbox);
      
      await waitFor(() => {
        const addSubnetButton = screen.getByText('Add Subnet');
        return user.click(addSubnetButton);
      });
      
      // Manually set runner users to exceed total
      await waitFor(async () => {
        const runnerUserInput = screen.getByDisplayValue('10');
        await user.clear(runnerUserInput);
        await user.type(runnerUserInput, '15');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Warning.*exceeds expected users/)).toBeInTheDocument();
      });
    });
  });
});