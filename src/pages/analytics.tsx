import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Target,
  Clock,
  Award,
  Activity,
  PieChart,
  LineChart
} from "lucide-react";

export default function Analytics() {
  const { userProfile } = useAuth();
  const isSupervisor = userProfile?.role === "supervisor";

  const performanceData = [
    { month: "Jan", value: 85 },
    { month: "Feb", value: 88 },
    { month: "Mar", value: 92 },
    { month: "Apr", value: 89 },
    { month: "May", value: 95 },
    { month: "Jun", value: 93 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-analytics-title">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-analytics-subtitle">
            {isSupervisor 
              ? "Track team performance and project metrics"
              : "Monitor your progress and achievements"
            }
          </p>
        </div>
        <Badge variant={isSupervisor ? "default" : "secondary"} className="text-sm">
          {isSupervisor ? "Supervisor View" : "Intern View"}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-overall-performance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94.2%</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
            <div className="w-full bg-muted h-2 rounded-full mt-3">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSupervisor ? "Team Tasks" : "Completed Tasks"}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{isSupervisor ? "156" : "47"}</div>
            <p className="text-xs text-muted-foreground">
              {isSupervisor ? "Total assigned" : "This month"}
            </p>
            <div className="w-full bg-muted h-2 rounded-full mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-completion-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">2.4 days</div>
            <p className="text-xs text-muted-foreground">-0.3 days improved</p>
            <div className="w-full bg-muted h-2 rounded-full mt-3">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-achievement-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievement Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8.7/10</div>
            <p className="text-xs text-muted-foreground">+0.4 this week</p>
            <div className="w-full bg-muted h-2 rounded-full mt-3">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '87%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card data-testid="card-performance-trend">
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="w-5 h-5 mr-2" />
              Performance Trend
            </CardTitle>
            <CardDescription>Monthly performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {performanceData.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-primary rounded-t w-full"
                    style={{ height: `${(item.value / 100) * 200}px` }}
                  ></div>
                  <div className="text-xs text-muted-foreground mt-2">{item.month}</div>
                  <div className="text-xs font-medium">{item.value}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card data-testid="card-task-distribution">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Task Distribution
            </CardTitle>
            <CardDescription>Breakdown by category and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Overdue</span>
                </div>
                <span className="text-sm font-medium">6%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-sm font-medium">4%</span>
              </div>
              
              {/* Visual representation */}
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex mt-4">
                <div className="bg-green-500 h-full" style={{ width: '65%' }}></div>
                <div className="bg-yellow-500 h-full" style={{ width: '25%' }}></div>
                <div className="bg-red-500 h-full" style={{ width: '6%' }}></div>
                <div className="bg-gray-500 h-full" style={{ width: '4%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance (Supervisor only) */}
        {isSupervisor && (
          <Card data-testid="card-team-performance">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Team Performance
              </CardTitle>
              <CardDescription>Individual team member metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      JS
                    </div>
                    <div>
                      <p className="text-sm font-medium">John Smith</p>
                      <p className="text-xs text-muted-foreground">Frontend Dev</p>
                    </div>
                  </div>
                  <Badge variant="default">95%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      AD
                    </div>
                    <div>
                      <p className="text-sm font-medium">Alice Davis</p>
                      <p className="text-xs text-muted-foreground">Backend Dev</p>
                    </div>
                  </div>
                  <Badge variant="default">92%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      MJ
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mike Johnson</p>
                      <p className="text-xs text-muted-foreground">UI/UX Designer</p>
                    </div>
                  </div>
                  <Badge variant="secondary">88%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities */}
        <Card data-testid="card-recent-activities">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest performance updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Task completed ahead of schedule</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Performance milestone reached</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Weekly report submitted</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Achievement badge earned</p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals & Targets */}
        <Card data-testid="card-goals-targets">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Goals & Targets
            </CardTitle>
            <CardDescription>Current objectives and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Tasks</span>
                  <span>47/50</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Skill Development</span>
                  <span>8/10</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Team Collaboration</span>
                  <span>9/10</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Project Quality</span>
                  <span>95/100</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" data-testid="button-export-data">
          <BarChart3 className="w-4 h-4 mr-2" />
          Export Data
        </Button>
        <Button data-testid="button-generate-report">
          <Calendar className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>
    </div>
  );
}