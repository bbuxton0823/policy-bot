import { useState } from 'react';

// Define the data structure for policy comparison
export interface PolicyData {
  category: string;
  currentPolicy: number;
  turnerPolicy: number;
}

export const usePolicyChartData = () => {
  // Default data for HUD policies comparison
  const [policyData, setPolicyData] = useState<PolicyData[]>([
    {
      category: "AFFH Rule",
      currentPolicy: 100, // Fully implemented
      turnerPolicy: 0,    // Eliminated
    },
    {
      category: "DEI Policies",
      currentPolicy: 100, // Fully implemented
      turnerPolicy: 10,   // Significantly reduced
    },
    {
      category: "Fair Housing",
      currentPolicy: 90, // Mostly implemented
      turnerPolicy: 30,  // Partially implemented
    },
    {
      category: "Homeless Assistance",
      currentPolicy: 85, // Mostly implemented
      turnerPolicy: 40,  // Partially implemented
    }
  ]);

  // Function to update the chart data
  const updatePolicyData = (newData: PolicyData[]) => {
    setPolicyData(newData);
  };

  return {
    policyData,
    updatePolicyData
  };
};

// Helper function to create policy data from text description
export const createPolicyDataFromText = (text: string): PolicyData[] => {
  // This is a simple parser for demonstration purposes
  // In a real app, you might want a more robust parser
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const data: PolicyData[] = [];
  
  // Check if this is a chart creation request without specific data
  const isChartRequest = text.toLowerCase().includes('create a chart') || 
                         text.toLowerCase().includes('show a chart') ||
                         text.toLowerCase().includes('generate a chart') ||
                         text.toLowerCase().includes('make a chart') ||
                         text.toLowerCase().includes('display a chart') ||
                         text.toLowerCase().includes('policy comparison chart');
  
  // If it's just a chart request without specific data, return default data
  if (isChartRequest && !text.includes('%') && !text.includes('implemented')) {
    return [
      {
        category: "AFFH Rule",
        currentPolicy: 100, // Fully implemented
        turnerPolicy: 0,    // Eliminated
      },
      {
        category: "DEI Policies",
        currentPolicy: 100, // Fully implemented
        turnerPolicy: 10,   // Significantly reduced
      },
      {
        category: "Fair Housing",
        currentPolicy: 90, // Mostly implemented
        turnerPolicy: 30,  // Partially implemented
      },
      {
        category: "Homeless Assistance",
        currentPolicy: 85, // Mostly implemented
        turnerPolicy: 40,  // Partially implemented
      }
    ];
  }
  
  for (const line of lines) {
    // Look for patterns like "Policy Name: Current X%, Turner Y%"
    const match = line.match(/([^:]+):\s*Current\s*(\d+)%,\s*Turner\s*(\d+)%/i);
    if (match) {
      data.push({
        category: match[1].trim(),
        currentPolicy: parseInt(match[2], 10),
        turnerPolicy: parseInt(match[3], 10)
      });
      continue;
    }
    
    // Alternative format: look for "Policy Name - Current: Fully implemented, Turner: Eliminated"
    const statusMatch = line.match(/([^-]+)-\s*Current:\s*([^,]+),\s*Turner:\s*([^,]+)/i);
    if (statusMatch) {
      const category = statusMatch[1].trim();
      const currentStatus = statusMatch[2].trim().toLowerCase();
      const turnerStatus = statusMatch[3].trim().toLowerCase();
      
      // Convert text statuses to numeric values
      const currentValue = currentStatus.includes('full') ? 100 : 
                          currentStatus.includes('partial') ? 50 : 0;
      const turnerValue = turnerStatus.includes('full') ? 100 : 
                         turnerStatus.includes('partial') ? 50 :
                         turnerStatus.includes('reduced') ? 10 : 0;
      
      data.push({
        category,
        currentPolicy: currentValue,
        turnerPolicy: turnerValue
      });
    }
  }
  
  return data.length > 0 ? data : [
    {
      category: "AFFH Rule",
      currentPolicy: 100,
      turnerPolicy: 0,
    },
    {
      category: "DEI Policies",
      currentPolicy: 100,
      turnerPolicy: 10,
    },
    {
      category: "Fair Housing",
      currentPolicy: 90,
      turnerPolicy: 30,
    },
    {
      category: "Homeless Assistance",
      currentPolicy: 85,
      turnerPolicy: 40,
    }
  ];
}; 