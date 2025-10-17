
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Mock data for sourcing list
const DEFAULT_SOURCING_ITEMS = [
  { 
    id: '1', 
    make: 'Audi', 
    model: 'Q5', 
    minYear: 2020, 
    maxYear: 2023, 
    minMileage: 0, 
    maxMileage: 30000, 
    color: 'Black',
    minPrice: 25000,
    maxPrice: 35000,
    dateAdded: '2025-04-22',
    lastChecked: '2025-04-27',
    status: 'active',
    matches: 2,
  },
  { 
    id: '2', 
    make: 'BMW', 
    model: 'X3', 
    minYear: 2021, 
    maxYear: null, 
    minMileage: 0, 
    maxMileage: 20000, 
    color: 'Blue',
    minPrice: 30000,
    maxPrice: 40000,
    dateAdded: '2025-04-20',
    lastChecked: '2025-04-27',
    status: 'active',
    matches: 0,
  },
  { 
    id: '3', 
    make: 'Mercedes-Benz', 
    model: 'GLC', 
    minYear: 2019, 
    maxYear: 2022, 
    minMileage: 0, 
    maxMileage: 50000, 
    color: '',
    minPrice: 28000,
    maxPrice: 38000,
    dateAdded: '2025-04-18',
    lastChecked: '2025-04-27',
    status: 'found',
    matches: 3,
  },
  { 
    id: '4', 
    make: 'Land Rover', 
    model: 'Discovery Sport', 
    minYear: 2020, 
    maxYear: 2023, 
    minMileage: 0, 
    maxMileage: 40000, 
    color: 'White',
    minPrice: 32000,
    maxPrice: 45000,
    dateAdded: '2025-04-15',
    lastChecked: '2025-04-27',
    status: 'completed',
    matches: 1,
  },
];

export default function SourcingList() {
  const [sourcingItems, setSourcingItems] = useState(DEFAULT_SOURCING_ITEMS);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const handleRemoveItem = (id: string) => {
    setSourcingItems(sourcingItems.filter(item => item.id !== id));
  };

  const handleChangeStatus = (id: string, newStatus: string) => {
    setSourcingItems(sourcingItems.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  // Filter items by status
  const activeItems = sourcingItems.filter(item => item.status === 'active');
  const foundItems = sourcingItems.filter(item => item.status === 'found');
  const completedItems = sourcingItems.filter(item => item.status === 'completed');

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
      case 'found':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Matches Found</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'found':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Vehicle Sourcing List</h2>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({sourcingItems.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="found">Matches Found ({foundItems.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedItems.length})</TabsTrigger>
        </TabsList>

        {['all', 'active', 'found', 'completed'].map((tab) => {
          let items;
          switch (tab) {
            case 'active':
              items = activeItems;
              break;
            case 'found':
              items = foundItems;
              break;
            case 'completed':
              items = completedItems;
              break;
            default:
              items = sourcingItems;
          }

          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === 'all' ? 'All Sourcing Requests' : 
                      tab === 'active' ? 'Active Sourcing Requests' :
                      tab === 'found' ? 'Vehicles Found' : 'Completed Requests'}
                  </CardTitle>
                  <CardDescription>
                    {tab === 'all' ? 'All vehicle sourcing requests' :
                      tab === 'active' ? 'Currently searching for these vehicles' :
                      tab === 'found' ? 'Matching vehicles have been found' : 'Sourcing requests marked as completed'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Make/Model</TableHead>
                        <TableHead>Year Range</TableHead>
                        <TableHead>Mileage Range</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead>Matches</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                            No items in this category
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.status)}
                                {getStatusBadge(item.status)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.make} {item.model}
                            </TableCell>
                            <TableCell>
                              {item.minYear}{item.maxYear ? ` - ${item.maxYear}` : '+'}
                            </TableCell>
                            <TableCell>
                              {item.minMileage.toLocaleString()}{item.maxMileage ? ` - ${item.maxMileage.toLocaleString()}` : '+'} miles
                            </TableCell>
                            <TableCell>{item.color || 'Any'}</TableCell>
                            <TableCell>{item.dateAdded}</TableCell>
                            <TableCell>
                              {item.matches > 0 ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                  {item.matches} match{item.matches !== 1 ? 'es' : ''}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">None yet</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog open={isViewDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                                  setIsViewDialogOpen(open);
                                  if (!open) setSelectedItem(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedItem(item)}
                                    >
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Sourcing Request Details</DialogTitle>
                                      <DialogDescription>
                                        Details for the {item.make} {item.model} sourcing request
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedItem && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-sm text-muted-foreground">Make</p>
                                            <p className="font-medium">{selectedItem.make}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Model</p>
                                            <p className="font-medium">{selectedItem.model}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Year Range</p>
                                            <p className="font-medium">
                                              {selectedItem.minYear}{selectedItem.maxYear ? ` - ${selectedItem.maxYear}` : '+'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Mileage Range</p>
                                            <p className="font-medium">
                                              {selectedItem.minMileage.toLocaleString()}{selectedItem.maxMileage ? ` - ${selectedItem.maxMileage.toLocaleString()}` : '+'} miles
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Color</p>
                                            <p className="font-medium">{selectedItem.color || 'Any'}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Price Range</p>
                                            <p className="font-medium">
                                              £{selectedItem.minPrice.toLocaleString()} - £{selectedItem.maxPrice.toLocaleString()}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Date Added</p>
                                            <p className="font-medium">{selectedItem.dateAdded}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Last Checked</p>
                                            <p className="font-medium">{selectedItem.lastChecked}</p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <p className="font-medium flex items-center gap-2 mt-1">
                                              {getStatusIcon(selectedItem.status)}
                                              {getStatusBadge(selectedItem.status)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-sm text-muted-foreground">Matches</p>
                                            <p className="font-medium">{selectedItem.matches}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <DialogFooter className="gap-2 sm:justify-between">
                                      <div className="flex gap-2">
                                        {selectedItem?.status !== 'completed' && (
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              handleChangeStatus(selectedItem.id, 'completed');
                                              setIsViewDialogOpen(false);
                                            }}
                                          >
                                            Mark Complete
                                          </Button>
                                        )}
                                        <Button
                                          variant="destructive"
                                          onClick={() => {
                                            handleRemoveItem(selectedItem.id);
                                            setIsViewDialogOpen(false);
                                          }}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                      <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                        Close
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                {item.matches > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      // This would navigate to results in a real app
                                      console.log(`View matches for ${item.id}`);
                                    }}
                                  >
                                    View Matches
                                  </Button>
                                )}

                                {item.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleChangeStatus(item.id, 'completed')}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
