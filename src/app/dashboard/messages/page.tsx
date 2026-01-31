"use client"

import { useState } from "react"
import { mockUsers } from "../users/data"
import { mockConversations, Message } from "./data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, MessageSquare, User, Bot, Clock, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils" // Assuming this utility exists or I'll implement a local one
import { useRouter } from "next/navigation"

export default function MessagesPage() {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter users based on search
  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedUser = mockUsers.find(u => u.id === selectedUserId)
  const conversation = mockConversations.find(c => c.userId === selectedUserId)
  const messages = conversation ? conversation.messages : []

  // Helper to format time nicely
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getDateHeader = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex-none">
        <h1 className="text-3xl font-bold tracking-tight">User & AI Messages</h1>
        <p className="text-muted-foreground">Monitor and review AI interactions by user account.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 border rounded-lg overflow-hidden bg-background shadow-sm">
        
        {/* Left Sidebar: User List */}
        <div className="md:col-span-4 lg:col-span-3 border-r flex flex-col bg-muted/10">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors hover:bg-accent ${
                    selectedUserId === user.id ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {mockConversations.find(c => c.userId === user.id) && (
                     <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content: Message History */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col bg-background">
          {selectedUser ? (
            <>
              {/* Converstation Header */}
              <div className="flex-none p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback>{selectedUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      {selectedUser.name}
                      <Badge variant="outline" className="font-normal text-xs">{selectedUser.plan} Plan</Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/users/${selectedUser.id}`)}>
                  View Profile <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => {
                      // Show date separator if date changes
                      const showDate = index === 0 || 
                        getDateHeader(msg.timestamp) !== getDateHeader(messages[index - 1].timestamp);

                      return (
                        <div key={msg.id} className="space-y-4">
                          {showDate && (
                            <div className="flex items-center gap-4">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {getDateHeader(msg.timestamp)}
                              </span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          
                          <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                              <div className="flex-none h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border">
                                <Bot className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            
                            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                <span>{msg.role === 'user' ? 'User' : 'AI Assistant'}</span>
                                <span>•</span>
                                <span>{formatTime(msg.timestamp)}</span>
                              </div>
                              <div 
                                className={`rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
                                  msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                    : 'bg-muted rounded-tl-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>

                            {msg.role === 'user' && (
                              <Avatar className="flex-none h-8 w-8">
                                <AvatarImage src={selectedUser.avatar} />
                                <AvatarFallback>{selectedUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground space-y-4">
                      <MessageSquare className="h-12 w-12 opacity-20" />
                      <p>No conversation history found for this user.</p>
                      <Badge variant="outline">New Account</Badge>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t bg-muted/5 text-center text-xs text-muted-foreground">
                Displaying recent messages. Interactions are retained for 30 days.
              </div>

            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <User className="h-8 w-8 opacity-50" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Select a User</h3>
                <p>Choose a user from the list to view their AI conversation history.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
