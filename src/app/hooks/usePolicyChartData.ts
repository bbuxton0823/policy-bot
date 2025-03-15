import { useState } from 'react';

// Define the data structure for policy comparison
export interface PolicyData {
  category: string;
  currentPolicy: number;
  turnerPolicy: number;
}

export const usePolicyChartData = () => {
  // Initialize with empty array instead of default data
  const [policyData, setPolicyData] = useState<PolicyData[]>([]);

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
  // Make this more specific to only match explicit HUD policy chart requests
  const isHudChartRequest = 
    (text.toLowerCase().includes('hud') || 
     text.toLowerCase().includes('housing and urban development')) &&
    (text.toLowerCase().includes('create a chart') || 
     text.toLowerCase().includes('show a chart') ||
     text.toLowerCase().includes('generate a chart') ||
     text.toLowerCase().includes('make a chart') ||
     text.toLowerCase().includes('display a chart') ||
     text.toLowerCase().includes('policy comparison chart'));
  
  // Only return default HUD data if explicitly requested
  if (isHudChartRequest && !text.includes('%') && !text.includes('implemented')) {
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
  
  // Return the parsed data if we found any, otherwise return an empty array
  return data.length > 0 ? data : [];
}; 