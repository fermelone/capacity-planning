import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, User, Globe2, Network, Database, AlertCircle, Plus, Minus, HelpCircle, Share2, Cpu, Users, Link, Check } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export interface Runner {
  id: string;
  name: string;
  region: string;
  users: number;
  subnetIds: string[];
  capacity: number;
}

export interface Subnet {
  id: string;
  name: string;
  region: string;
  az: string;
  cidrSize: number;
  availableIps: number;
}

const SUBNET_OPTIONS = [
  { value: 16, label: "/16 (65,536 IPs)" },
  { value: 17, label: "/17 (32,768 IPs)" },
  { value: 18, label: "/18 (16,384 IPs)" },
  { value: 19, label: "/19 (8,192 IPs)" },
  { value: 20, label: "/20 (4,096 IPs)" },
  { value: 21, label: "/21 (2,048 IPs)" },
  { value: 22, label: "/22 (1,024 IPs)" },
];

const AWS_REGIONS = {
  "North America": [
    { value: "us-east-1", label: "US East (us-east-1)" },
    { value: "us-east-2", label: "US East (us-east-2)" },
    { value: "us-west-1", label: "US West (us-west-1)" },
    { value: "us-west-2", label: "US West (us-west-2)" },
    { value: "ca-central-1", label: "Canada Central (ca-central-1)" },
  ],
  "Europe": [
    { value: "eu-west-1", label: "EU West (eu-west-1)" },
    { value: "eu-central-1", label: "EU Central (eu-central-1)" },
  ],
  "Asia Pacific": [
    { value: "ap-southeast-1", label: "Asia Pacific (ap-southeast-1)" },
    { value: "ap-southeast-2", label: "Asia Pacific (ap-southeast-2)" },
    { value: "ap-northeast-1", label: "Asia Pacific (ap-northeast-1)" },
  ],
  "South America": [
    { value: "sa-east-1", label: "South America (sa-east-1)" },
  ],
};

function App() {
  const { toast } = useToast();
  const [totalUsers, setTotalUsers] = useState<number | string>(10);
  const [environmentsPerUser, setEnvironmentsPerUser] = useState<number | string>(1);
  const [azCount, setAzCount] = useState(2);
  const [subnetSize, setSubnetSize] = useState(16);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [nextRunnerId, setNextRunnerId] = useState(1);
  const [isSharing, setIsSharing] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  useEffect(() => {
    const loadStateFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state');
      
      if (state) {
        try {
          const decodedState = JSON.parse(atob(state));
          
          // Validate and sanitize inputs
          const validatedState = {
            totalUsers: Math.max(1, Math.min(99999, decodedState.totalUsers ?? 10)),
            environmentsPerUser: Math.max(1, Math.min(10, decodedState.environmentsPerUser ?? 1)),
            azCount: Math.max(1, Math.min(3, decodedState.azCount ?? 2)),
            subnetSize: Math.max(16, Math.min(22, decodedState.subnetSize ?? 16)),
            selectedRegions: Array.isArray(decodedState.selectedRegions) ? decodedState.selectedRegions : [],
            runners: Array.isArray(decodedState.runners) ? decodedState.runners : [],
            subnets: Array.isArray(decodedState.subnets) ? decodedState.subnets : [],
            nextRunnerId: Math.max(1, decodedState.nextRunnerId ?? 1),
          };
          
          // Set state in the correct order to avoid race conditions
          setTotalUsers(validatedState.totalUsers);
          setEnvironmentsPerUser(validatedState.environmentsPerUser);
          setAzCount(validatedState.azCount);
          setSubnetSize(validatedState.subnetSize);
          setSelectedRegions(validatedState.selectedRegions);
          setSubnets(validatedState.subnets);
          setRunners(validatedState.runners);
          setNextRunnerId(validatedState.nextRunnerId);
          
        } catch (error) {
          console.error('Failed to parse state from URL:', error);
          toast({
            title: "Invalid configuration URL",
            description: "The shared configuration could not be loaded. Starting with default values.",
            variant: "destructive",
          });
        }
      }
      
      setIsStateLoaded(true);
    };
    
    loadStateFromUrl();
  }, [toast]);

  useEffect(() => {
    if (!isStateLoaded) return;

    try {
      const state = {
        totalUsers,
        environmentsPerUser,
        azCount,
        subnetSize,
        selectedRegions,
        runners,
        subnets,
        nextRunnerId,
      };
      
      const encodedState = btoa(JSON.stringify(state));
      const newUrl = `${window.location.pathname}?state=${encodedState}`;
      
      // Check URL length and warn if too long
      if (newUrl.length > 2048) {
        console.warn('Generated URL is very long and may not work in all browsers:', newUrl.length, 'characters');
      }
      
      window.history.replaceState({}, '', newUrl);
    } catch (error) {
      console.error('Failed to update URL with state:', error);
      // Continue without updating URL rather than crashing
    }
  }, [isStateLoaded, totalUsers, environmentsPerUser, azCount, subnetSize, selectedRegions, runners, subnets, nextRunnerId]);

  // Auto-create runner when we have selected regions and subnets (and no runners exist)
  useEffect(() => {
    if (!isStateLoaded) return;
    const hasLoadedFromUrl = new URLSearchParams(window.location.search).has('state');
    
    // Create a default runner when we have regions and subnets but no runners
    if (selectedRegions.length > 0 && subnets.length > 0 && runners.length === 0 && !hasLoadedFromUrl) {
      const numUsers = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 10;
      const newRunner: Runner = {
        id: crypto.randomUUID(),
        name: `Runner 1`,
        region: selectedRegions[0],
        users: numUsers,
        subnetIds: [],
        capacity: 0
      };
      setNextRunnerId(2);
      setRunners([newRunner]);
    }
  }, [isStateLoaded, selectedRegions.length, subnets.length, runners.length, totalUsers]);
  
  // Clean up runners when no regions are selected
  useEffect(() => {
    if (!isStateLoaded) return;
    const hasLoadedFromUrl = new URLSearchParams(window.location.search).has('state');
    
    if (selectedRegions.length === 0 && runners.length > 0 && !hasLoadedFromUrl) {
      setRunners([]);
    }
  }, [isStateLoaded, selectedRegions.length, runners.length]);
  
  // Update runner regions when selected regions change
  useEffect(() => {
    if (!isStateLoaded || runners.length === 0 || selectedRegions.length === 0) return;
    
    setRunners(prev => prev.map(runner => {
      if (!selectedRegions.includes(runner.region)) {
        return {
          ...runner,
          region: selectedRegions[0],
          subnetIds: [],
          capacity: 0
        };
      }
      return runner;
    }));
  }, [isStateLoaded, selectedRegions, runners.length]);

  const shortenUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url));
      if (!response.ok) throw new Error('Failed to shorten URL');
      return await response.text();
    } catch (error) {
      console.error('Error shortening URL:', error);
      return url;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      let urlToShare = window.location.href;
      
      // Try to shorten URL, but don't fail if it doesn't work
      try {
        const shortUrl = await shortenUrl(urlToShare);
        if (shortUrl && shortUrl !== urlToShare && shortUrl.startsWith('http')) {
          urlToShare = shortUrl;
          toast({
            title: "Link copied!",
            description: "The shortened URL has been copied to your clipboard.",
          });
        } else {
          toast({
            title: "Link copied!",
            description: "The configuration URL has been copied to your clipboard.",
          });
        }
      } catch (shortenError) {
        // Silently continue with original URL if shortening fails
        toast({
          title: "Link copied!",
          description: "The configuration URL has been copied to your clipboard.",
        });
      }
      
      await navigator.clipboard.writeText(urlToShare);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Failed to copy link",
        description: "Please manually copy the URL from your browser's address bar.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const getValidSubnetSizes = (vpcSize: number) => {
    return Array.from({ length: 28 - vpcSize }, (_, i) => ({
      value: vpcSize + i + 1,
      label: `/${vpcSize + i + 1} (${(Math.pow(2, 32 - (vpcSize + i + 1)) - 5).toLocaleString()} IPs)`
    }));
  };

  const addSubnet = () => {
    if (selectedRegions.length === 0) return;
    
    const newSubnet: Subnet = {
      id: crypto.randomUUID(),
      name: `subnet-${subnets.length + 1}`,
      region: selectedRegions[0],
      az: 'a',
      cidrSize: subnetSize + 1,
      availableIps: Math.pow(2, 32 - (subnetSize + 1)) - 5
    };
    setSubnets([...subnets, newSubnet]);
  };

  const removeSubnet = (id: string) => {
    setSubnets(subnets.filter(subnet => subnet.id !== id));
  };

  const updateSubnet = (id: string, updates: Partial<Subnet>) => {
    setSubnets(subnets.map(subnet => 
      subnet.id === id 
        ? { 
            ...subnet, 
            ...updates,
            availableIps: updates.cidrSize 
              ? Math.pow(2, 32 - updates.cidrSize) - 5 
              : subnet.availableIps
          }
        : subnet
    ));
  };

  const getTotalAssignedUsers = useMemo(() => 
    runners.reduce((sum, runner) => sum + runner.users, 0), 
    [runners]
  );

  const distributeUsersAmongRunners = (runnerCount: number, totalUsersToDistribute: number) => {
    const baseUsers = Math.floor(totalUsersToDistribute / runnerCount);
    const remainder = totalUsersToDistribute % runnerCount;
    
    return Array.from({ length: runnerCount }, (_, index) => 
      baseUsers + (index < remainder ? 1 : 0)
    );
  };

  const addRunner = () => {
    if (selectedRegions.length === 0) return;
    
    const newRunnerCount = runners.length + 1;
    const numUsers = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 0;
    const userDistribution = distributeUsersAmongRunners(newRunnerCount, numUsers);
    
    const updatedRunners = runners.map((runner, index) => ({
      ...runner,
      users: userDistribution[index]
    }));
    
    const newRunner: Runner = {
      id: crypto.randomUUID(),
      name: `Runner ${nextRunnerId}`,
      region: selectedRegions[0],
      users: userDistribution[newRunnerCount - 1],
      subnetIds: [],
      capacity: 0
    };
    
    setNextRunnerId(prev => prev + 1);
    setRunners([...updatedRunners, newRunner]);
  };

  const removeRunner = (id: string) => {
    if (runners.length <= 1) return;
    
    const remainingRunners = runners.filter(r => r.id !== id);
    const numUsers = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 0;
    const userDistribution = distributeUsersAmongRunners(remainingRunners.length, numUsers);
    
    setRunners(remainingRunners.map((runner, index) => ({
      ...runner,
      users: userDistribution[index]
    })));
  };


  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const updateRunnerUsers = (runnerId: string, newUsers: number | string) => {
    setRunners(prev => prev.map(runner =>
      runner.id === runnerId
        ? { ...runner, users: Math.max(0, typeof newUsers === 'number' ? newUsers : Number(newUsers) || 0) }
        : runner
    ));
  };

  const updateRunnerName = (runnerId: string, newName: string) => {
    setRunners(prev => prev.map(runner =>
      runner.id === runnerId
        ? { ...runner, name: newName }
        : runner
    ));
  };

  const updateRunnerSubnets = (runnerId: string, subnetIds: string[]) => {
    setRunners(prev => prev.map(runner =>
      runner.id === runnerId
        ? { 
            ...runner, 
            subnetIds,
            capacity: subnetIds.reduce((sum, id) => {
              const subnet = subnets.find(s => s.id === id);
              return sum + (subnet?.availableIps || 0);
            }, 0)
          }
        : runner
    ));
  };

  const getRunnerPlannedUtilization = (runner: Runner) => {
    const envs = typeof environmentsPerUser === 'number' ? environmentsPerUser : Number(environmentsPerUser) || 1;
    return runner.users * envs;
  };

  const getTotalPlannedUtilization = useMemo(() => {
    const users = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 0;
    const envs = typeof environmentsPerUser === 'number' ? environmentsPerUser : Number(environmentsPerUser) || 1;
    return users * envs;
  }, [totalUsers, environmentsPerUser]);
  
  const getTotalCapacity = useMemo(() => {
    const uniqueSubnetIds = new Set(runners.flatMap(runner => runner.subnetIds));
    
    return Array.from(uniqueSubnetIds).reduce((sum, subnetId) => {
      const subnet = subnets.find(s => s.id === subnetId);
      return sum + (subnet?.availableIps || 0);
    }, 0);
  }, [runners, subnets]);

  const getOverCapacityRunners = useMemo(() => {
    return runners.filter(runner => {
      const plannedUtilization = getRunnerPlannedUtilization(runner);
      return plannedUtilization > runner.capacity && runner.capacity > 0;
    });
  }, [runners, environmentsPerUser]);

  const getUtilizationPercentage = useCallback(() => {
    return getTotalCapacity > 0
      ? Math.round((getTotalPlannedUtilization / getTotalCapacity) * 100)
      : 0;
  }, [getTotalCapacity, getTotalPlannedUtilization]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const utilizationPercent = getUtilizationPercentage();
    
    doc.setFontSize(16);
    doc.text("Capacity Planning Summary", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Users: ${totalUsers}`, 20, 30);
    doc.text(`Environments per User: ${environmentsPerUser}`, 20, 40);
    doc.text(`AZ Count: ${azCount}`, 20, 50);
    doc.text(`VPC Primary CIDR Block Size: /${subnetSize}`, 20, 60);
    
    doc.setFontSize(14);
    doc.text("Subnet Configuration", 20, 80);
    
    const subnetHeaders = ["Name", "Region", "AZ", "CIDR Size", "Available IPs"];
    let y = 90;
    
    doc.setFontSize(10);
    subnetHeaders.forEach((header, i) => {
      doc.text(header, 20 + (i * 30), y);
    });
    
    y += 10;
    subnets.forEach(subnet => {
      doc.text(subnet.name, 20, y);
      doc.text(subnet.region, 50, y);
      doc.text(`${subnet.region}-${subnet.az}`, 80, y);
      doc.text(`/${subnet.cidrSize}`, 110, y);
      doc.text(subnet.availableIps.toLocaleString(), 140, y);
      y += 10;
    });
    
    y += 10;
    doc.setFontSize(14);
    doc.text("Runner Configuration", 20, y);
    y += 10;
    
    const runnerHeaders = ["Runner", "Region", "Planned Users", "Subnets", "Capacity"];
    doc.setFontSize(10);
    runnerHeaders.forEach((header, i) => {
      doc.text(header, 20 + (i * 30), y);
    });
    
    y += 10;
    runners.forEach(runner => {
      const runnerSubnets = runner.subnetIds.map(id => subnets.find(s => s.id === id)?.name).filter(Boolean);
      doc.text(runner.name, 20, y);
      doc.text(runner.region, 50, y);
      doc.text(getRunnerPlannedUtilization(runner).toString(), 80, y);
      doc.text(runnerSubnets.join(", ") || "None", 110, y);
      doc.text(runner.capacity.toLocaleString(), 140, y);
      y += 10;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text("Capacity Summary", 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Planned Users: ${getTotalPlannedUtilization.toLocaleString()}`, 20, y);
    y += 10;
    doc.text(`Total Capacity: ${getTotalCapacity.toLocaleString()}`, 20, y);
    y += 10;
    doc.text(`Utilization: ${utilizationPercent}%`, 20, y);
    
    // Clean up blob URL after a delay to ensure download completes
    setTimeout(() => {
      // Cleanup handled by jsPDF internally
    }, 1000);
    
    doc.save("capacity-planning.pdf");
  };

  const exportToCSV = () => {
    const subnetData = subnets.map(subnet => ({
      'Record Type': 'Subnet',
      'Name/Runner': subnet.name,
      Region: subnet.region,
      AZ: `${subnet.region}-${subnet.az}`,
      'Subnet/CIDR': `/${subnet.cidrSize}`,
      'Available IPs': subnet.availableIps,
      'Planned Users': '',
      Capacity: subnet.availableIps,
    }));

    const runnerData = runners.map(runner => {
      const runnerSubnets = runner.subnetIds.map(id => subnets.find(s => s.id === id)?.name).filter(Boolean);
      return {
        'Record Type': 'Runner',
        'Name/Runner': runner.name,
        Region: runner.region,
        AZ: '',
        'Subnet/CIDR': runnerSubnets.join(", ") || "None",
        'Available IPs': '',
        'Planned Users': getRunnerPlannedUtilization(runner),
        Capacity: runner.capacity,
      };
    });
    
    const csv = Papa.unparse([...subnetData, ...runnerData]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'capacity-planning.csv';
    link.click();
    
    // Clean up blob URL to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const exportToText = () => {
    const utilizationPercent = getUtilizationPercentage();
    let text = `Capacity Planning Summary\n\n`;
    text += `Total Users: ${totalUsers}\n`;
    text += `Environments per User: ${environmentsPerUser}\n`;
    text += `AZ Count: ${azCount}\n`;
    text += `VPC Primary CIDR Block Size: /${subnetSize}\n\n`;
    
    text += `Subnet Configuration:\n`;
    subnets.forEach(subnet => {
      text += `\n${subnet.name}:\n`;
      text += `  Region: ${subnet.region}\n`;
      text += `  AZ: ${subnet.region}-${subnet.az}\n`;
      text += `  CIDR Size: /${subnet.cidrSize}\n`;
      text += `  Available IPs: ${subnet.availableIps.toLocaleString()}\n`;
    });
    
    text += `\nRunners:\n`;
    runners.forEach(runner => {
      const runnerSubnets = runner.subnetIds.map(id => subnets.find(s => s.id === id)?.name).filter(Boolean);
      text += `\n${runner.name}:\n`;
      text += `  Region: ${runner.region}\n`;
      text += `  Planned Users: ${getRunnerPlannedUtilization(runner).toLocaleString()}\n`;
      text += `  Subnets: ${runnerSubnets.join(", ") || "None"}\n`;
      text += `  Capacity: ${runner.capacity.toLocaleString()}\n`;
    });

    text += `\nCapacity Summary:\n`;
    text += `Planned Users: ${getTotalPlannedUtilization.toLocaleString()}\n`;
    text += `Total Capacity: ${getTotalCapacity.toLocaleString()}\n`;
    text += `Utilization: ${utilizationPercent}%\n`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'capacity-planning.txt';
    link.click();
    
    // Clean up blob URL to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const totalAssignedUsers = getTotalAssignedUsers;
  const numericTotalUsers = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 0;
  const isOverAllocated = useMemo(() => totalAssignedUsers > numericTotalUsers, [totalAssignedUsers, numericTotalUsers]);
  const isUnderAllocated = useMemo(() => totalAssignedUsers < numericTotalUsers, [totalAssignedUsers, numericTotalUsers]);

  const getSharedSubnets = useMemo(() => {
    const subnetUsage = runners.reduce((acc, runner) => {
      runner.subnetIds.forEach(id => {
        acc[id] = (acc[id] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(subnetUsage)
      .filter(([_, count]) => count > 1)
      .map(([subnetId]) => subnets.find(s => s.id === subnetId)?.name)
      .filter(Boolean);
  }, [runners, subnets]);

  useEffect(() => {
    setRunners(prev => prev.map(runner => {
      // Filter out subnets that no longer exist OR are not in the runner's region
      const validSubnetIds = runner.subnetIds.filter(id => 
        subnets.some(s => s.id === id && s.region === runner.region)
      );
      
      return {
        ...runner,
        subnetIds: validSubnetIds,
        capacity: validSubnetIds.reduce((sum, id) => {
          const subnet = subnets.find(s => s.id === id);
          return sum + (subnet?.availableIps || 0);
        }, 0),
      };
    }));
  }, [subnets]);

  const utilizationPercentage = useMemo(() => getUtilizationPercentage(), [getUtilizationPercentage]);
  const utilizationColor = useMemo(() => utilizationPercentage > 100 ? '#DC2626' : '#84CC16', [utilizationPercentage]);

  const overCapacityRunners = getOverCapacityRunners;

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Gitpod Flex Capacity Planning</h1>
            <p className="text-lg text-muted-foreground">
              Plan your <a href="https://www.gitpod.io/docs/flex/introduction/runners" className="text-primary hover:underline">runner</a> infrastructure across AWS regions
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-2 space-y-4">
              <h2 className="text-xl font-semibold">Environment calculation</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-card h-[180px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Expected Users</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <Input
                        type="number"
                        min="1"
                        max="99999"
                        value={totalUsers}
                        className="bg-secondary text-center text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            setTotalUsers('');
                          } else {
                            const numValue = Number(inputValue);
                            if (!isNaN(numValue)) {
                              setTotalUsers(Math.min(99999, Math.max(1, numValue)));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === '' || Number(value) < 1) {
                            setTotalUsers(1);
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-card h-[180px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 mb-4">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold"># Env per User</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={environmentsPerUser}
                        className="bg-secondary text-center text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            setEnvironmentsPerUser('');
                          } else {
                            const numValue = Number(inputValue);
                            if (!isNaN(numValue)) {
                              setEnvironmentsPerUser(Math.min(10, Math.max(1, numValue)));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === '' || Number(value) < 1) {
                            setEnvironmentsPerUser(1);
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <h2 className="text-xl font-semibold">Network configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-card h-[180px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 mb-4">
                      <Network className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Availability Zones</h3>
                    </div>
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                      <Slider
                        min={1}
                        max={3}
                        step={1}
                        value={[azCount]}
                        onValueChange={(value) => setAzCount(value[0])}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-muted-foreground">
                        {azCount} {azCount === 1 ? 'Zone' : 'Zones'}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-card h-[180px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-2 mb-4">
                      <Database className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">VPC Primary CIDR Block Size</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <Select value={subnetSize.toString()} onValueChange={(value) => setSubnetSize(Number(value))}>
                        <SelectTrigger className="bg-secondary text-center">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBNET_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <Card className="p-6 bg-card">
            <div className="flex items-center space-x-2 mb-4">
              <Globe2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">AWS Regions</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {Object.entries(AWS_REGIONS).map(([continent, regions]) => (
                <div key={continent}>
                  <h3 className="font-semibold mb-2">{continent}</h3>
                  <div className="space-y-2">
                    {regions.map((region) => (
                      <div key={region.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={region.value}
                          checked={selectedRegions.includes(region.value)}
                          onChange={() => handleRegionToggle(region.value)}
                          className="h-4 w-4 accent-primary"
                        />
                        <Label htmlFor={region.value}>{region.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {selectedRegions.length > 0 && <Card className="p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">VPC Subnet Configuration</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Configure subnets within your VPC CIDR block. Each subnet must be smaller than the VPC and will have 5 reserved IPs (first 4 and last 1).</p>
                      <a 
                        href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline mt-2 block"
                      >
                        Learn more about AWS VPC subnets
                      </a>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button onClick={addSubnet} variant="outline" size="sm" disabled={selectedRegions.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subnet
              </Button>
            </div>

            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead className="text-center">Subnet Name</TableHead>
                    <TableHead className="text-center">Region</TableHead>
                    <TableHead className="text-center">AZ</TableHead>
                    <TableHead className="text-center">CIDR Size</TableHead>
                    <TableHead className="text-center">Available IPs</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subnets.map((subnet) => (
                    <TableRow key={subnet.id} className="hover:bg-secondary/50">
                      <TableCell>
                        <Input
                          value={subnet.name}
                          onChange={(e) => updateSubnet(subnet.id, { name: e.target.value })}
                          className="bg-secondary text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={subnet.region}
                          onValueChange={(value) => updateSubnet(subnet.id, { region: value })}
                        >
                          <SelectTrigger className="bg-secondary text-center">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedRegions.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={subnet.az}
                          onValueChange={(value) => updateSubnet(subnet.id, { az: value })}
                        >
                          <SelectTrigger className="bg-secondary text-center">
                            <SelectValue />
                          </SelectTrigger>
                          
                          <SelectContent>
                            {['a', 'b', 'c'].slice(0, azCount).map((az) => (
                              <SelectItem key={az} value={az}>
                                {subnet.region}-{az}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={subnet.cidrSize.toString()}
                          onValueChange={(value) => updateSubnet(subnet.id, { cidrSize: parseInt(value) })}
                        >
                          <SelectTrigger className="bg-secondary text-center">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getValidSubnetSizes(subnetSize).map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {subnet.availableIps.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => removeSubnet(subnet.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>}

          {subnets.length > 0 && (() => {
            // Ensure we have at least one runner when showing the table
            if (selectedRegions.length > 0 && runners.length === 0) {
              const numUsers = typeof totalUsers === 'number' ? totalUsers : Number(totalUsers) || 10;
              const defaultRunner: Runner = {
                id: crypto.randomUUID(),
                name: `Runner 1`,
                region: selectedRegions[0],
                users: numUsers,
                subnetIds: [],
                capacity: 0
              };
              setRunners([defaultRunner]);
              setNextRunnerId(2);
            }
            return (
            <>
              <Card className="p-6 bg-card">
                <div className="flex flex-col space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">Runner Configuration</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={addRunner}
                        variant="outline"
                        size="sm"
                        className="mr-4"
                        disabled={selectedRegions.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Runner
                      </Button>
                      <Button onClick={exportToPDF} variant="secondary" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button onClick={exportToCSV} variant="secondary" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button onClick={exportToText} variant="secondary" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Text
                      </Button>
                    </div>
                  </div>
                  {isOverAllocated && (
                    <div className="flex items-center space-x-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span>Warning: Total allocated users ({totalAssignedUsers}) exceeds expected users ({numericTotalUsers})</span>
                    </div>
                  )}
                  {isUnderAllocated && (
                    <div className="flex items-center space-x-2 text-yellow-500">
                      <AlertCircle className="h-5 w-5" />
                      <span>Warning: Total allocated users ({totalAssignedUsers}) is below expected users ({numericTotalUsers})</span>
                    </div>
                  )}
                  {getSharedSubnets.length > 0 && (
                    <div className="flex items-center space-x-2 text-orange-500">
                      <Share2 className="h-5 w-5" />
                      <span>
                        Warning: The following subnets are shared between multiple runners:{' '}
                        {getSharedSubnets.join(', ')}
                      </span>
                    </div>
                  )}
                  {overCapacityRunners.length > 0 && (
                    <div className="flex items-center space-x-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span>
                        Warning: The following runners exceed their subnet capacity:{' '}
                        {overCapacityRunners.map(runner => `${runner.name} (${getRunnerPlannedUtilization(runner).toLocaleString()} > ${runner.capacity.toLocaleString()})`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary hover:bg-secondary">
                        <TableHead className="text-center w-[200px]">Runner Name</TableHead>
                        <TableHead className="text-center w-[150px]">Region</TableHead>
                        <TableHead className="text-center w-[120px]">Planned Users</TableHead>
                        <TableHead className="text-center">Subnets</TableHead>
                        <TableHead className="text-center w-[120px]">Capacity</TableHead>
                        <TableHead className="text-center w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runners.map((runner) => (
                        <TableRow key={runner.id} className="hover:bg-secondary/50">
                          <TableCell className="text-center">
                            <Input
                              value={runner.name}
                              onChange={(e) => updateRunnerName(runner.id, e.target.value)}
                              className="w-full bg-secondary text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={runner.region}
                              onValueChange={(value) => {
                                setRunners(prev => prev.map(r => 
                                  r.id === runner.id 
                                    ? { ...r, region: value, subnetIds: [] } // Clear subnets when region changes
                                    : r
                                ));
                              }}
                            >
                              <SelectTrigger className="bg-secondary text-center">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedRegions.map((region) => (
                                  <SelectItem key={region} value={region}>
                                    {region}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={runner.users}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                if (inputValue === '') {
                                  updateRunnerUsers(runner.id, '');
                                } else {
                                  const newValue = Math.max(0, parseInt(inputValue) || 0);
                                  updateRunnerUsers(runner.id, newValue);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === '' || Number(value) < 0) {
                                  updateRunnerUsers(runner.id, 0);
                                }
                              }}
                              className="w-full bg-secondary text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <Select
                                onValueChange={() => {}} // Placeholder, actual logic handled by checkboxes
                              >
                                <SelectTrigger className="bg-secondary text-center">
                                  <SelectValue>
                                    <span className="text-sm">
                                      {runner.subnetIds.length > 0 
                                        ? `${runner.subnetIds.length} subnet${runner.subnetIds.length !== 1 ? 's' : ''} selected`
                                        : 'Select subnets'
                                      }
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <div className="p-2">
                                    {subnets.filter(s => s.region === runner.region).length === 0 ? (
                                      <div className="text-sm text-muted-foreground px-2 py-1">
                                        No subnets available for {runner.region}
                                      </div>
                                    ) : (
                                      subnets.filter(s => s.region === runner.region).map((subnet) => (
                                        <div key={subnet.id} className="flex items-center space-x-2 px-2 py-2 hover:bg-secondary/50 rounded">
                                          <input
                                            type="checkbox"
                                            id={`runner-${runner.id}-subnet-${subnet.id}`}
                                            checked={runner.subnetIds.includes(subnet.id)}
                                            onChange={(e) => {
                                              const newSubnetIds = e.target.checked
                                                ? [...runner.subnetIds, subnet.id]
                                                : runner.subnetIds.filter(id => id !== subnet.id);
                                              updateRunnerSubnets(runner.id, newSubnetIds);
                                            }}
                                            className="h-4 w-4 accent-primary"
                                          />
                                          <label 
                                            htmlFor={`runner-${runner.id}-subnet-${subnet.id}`} 
                                            className="flex-1 cursor-pointer text-sm"
                                          >
                                            {subnet.name} (/{subnet.cidrSize}, {subnet.availableIps.toLocaleString()} IPs)
                                          </label>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{runner.capacity.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => removeRunner(runner.id)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/90"
                              disabled={runners.length <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-secondary/50 font-semibold border-t-2 border-border">
                        <TableCell colSpan={2} className="text-right">
                          Total # Envs:
                        </TableCell>
                        <TableCell className="text-center">
                          {getTotalPlannedUtilization.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          Capacity Summary:
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col space-y-1">
                            <span>
                              {getTotalPlannedUtilization.toLocaleString()} / {getTotalCapacity.toLocaleString()}
                            </span>
                            <span 
                              className="text-sm"
                              style={{ color: utilizationColor }}
                            >
                              {utilizationPercentage}% utilization
                            </span>
                          </div>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
              
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center space-x-2"
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      <span>Share Configuration</span>
                    </>
                  )}
                </Button>
              </div>
            </>
            );
          })()}
        </div>
        <div className="mt-16 text-center text-muted-foreground">
          <a href="https://www.gitpod.io/docs/flex/runners/aws/capacity-planning" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            Learn more about AWS Runner capacity planning
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;