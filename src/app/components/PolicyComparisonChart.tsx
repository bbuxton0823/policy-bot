import React, { useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts';
import { Box, Text, IconButton, Tooltip as ChakraTooltip, useToast } from '@chakra-ui/react';
import { FiCopy, FiCheck, FiDownload } from 'react-icons/fi';
import html2canvas from 'html2canvas';

// Define the data structure for policy comparison
interface PolicyData {
  category: string;
  currentPolicy: number;
  turnerPolicy: number;
}

interface PolicyComparisonChartProps {
  title: string;
  data: PolicyData[];
}

const PolicyComparisonChart: React.FC<PolicyComparisonChartProps> = ({ title, data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const toast = useToast();

  const copyChartToClipboard = async () => {
    if (!chartRef.current) return;

    try {
      // Use html2canvas to create an image of the chart
      const canvas = await html2canvas(chartRef.current);
      
      try {
        // Try to copy to clipboard using the Clipboard API
        canvas.toBlob(async (blob: Blob | null) => {
          if (!blob) {
            throw new Error('Failed to create image blob');
          }
          
          try {
            // Create a ClipboardItem and write to clipboard
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            
            // Show success state
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            
            toast({
              title: 'Chart copied to clipboard',
              description: 'You can now paste it into any application that supports images',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } catch (clipboardError) {
            console.error('Clipboard API error:', clipboardError);
            // Fallback for browsers that don't support clipboard.write with images
            downloadChart(canvas);
          }
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        downloadChart(canvas);
      }
    } catch (error) {
      console.error('Error capturing chart:', error);
      toast({
        title: 'Failed to copy chart',
        description: 'Please try again or use screenshot instead',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Fallback method to download the chart as an image
  const downloadChart = (canvas: HTMLCanvasElement) => {
    try {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Chart downloaded',
        description: 'Your browser doesn\'t support direct copying of images. The chart has been downloaded instead.',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast({
        title: 'Failed to download chart',
        description: 'Please try again or use screenshot instead',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden" w="100%" position="relative">
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        bg="blue.50" 
        _dark={{ bg: "blue.900" }}
        p={2}
      >
        <Text fontSize="sm" fontWeight="bold">
          {title}
        </Text>
        <ChakraTooltip label={isCopied ? "Copied!" : "Copy chart to clipboard"}>
          <IconButton
            aria-label="Copy chart"
            icon={isCopied ? <FiCheck /> : <FiCopy />}
            size="sm"
            colorScheme={isCopied ? "green" : "blue"}
            variant="ghost"
            onClick={copyChartToClipboard}
          />
        </ChakraTooltip>
      </Box>
      <Box p={4} h="400px" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category">
              <Label value="Policy Categories" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`}
            >
              <Label 
                value="Policy Implementation Level" 
                angle={-90} 
                position="insideLeft"
                style={{ textAnchor: 'middle' }}
              />
            </YAxis>
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend verticalAlign="bottom" height={36} />
            <Bar 
              dataKey="currentPolicy" 
              name="Current Policies" 
              fill="#8dd1e1" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="turnerPolicy" 
              name="Under Scott Turner" 
              fill="#e57373" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PolicyComparisonChart; 