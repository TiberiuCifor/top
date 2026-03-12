'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Eye, EyeOff, RefreshCw, Plug, TreePalm, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Settings {
  JIRA_BASE_URL: string
  JIRA_EMAIL: string
  JIRA_API_TOKEN: string
  TEMPO_API_TOKEN: string
  BAMBOO_API_KEY: string
  BAMBOO_SUBDOMAIN: string
  WORKABLE_API_TOKEN: string
}

const DEFAULT: Settings = {
  JIRA_BASE_URL: '',
  JIRA_EMAIL: '',
  JIRA_API_TOKEN: '',
  TEMPO_API_TOKEN: '',
  BAMBOO_API_KEY: '',
  BAMBOO_SUBDOMAIN: '',
  WORKABLE_API_TOKEN: '',
}

type ConnStatus = 'idle' | 'testing' | 'ok' | 'error'

function StatusBadge({ status }: { status: ConnStatus }) {
  if (status === 'ok') return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" />Connected
    </div>
  )
  if (status === 'error') return (
    <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
      <XCircle className="w-3.5 h-3.5" />Failed
    </div>
  )
  return null
}

function TestButton({ status, disabled, onClick }: { status: ConnStatus; disabled: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={status === 'testing' || disabled}
      className="gap-2 text-xs"
    >
      {status === 'testing'
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <RefreshCw className="w-3.5 h-3.5" />}
      Test Connection
    </Button>
  )
}

export default function SettingsPage() {
  const [values, setValues] = useState<Settings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
  const [jiraStatus, setJiraStatus] = useState<ConnStatus>('idle')
  const [jiraInfo, setJiraInfo] = useState('')
  const [tempoStatus, setTempoStatus] = useState<ConnStatus>('idle')
  const [bambooStatus, setBambooStatus] = useState<ConnStatus>('idle')
  const [bambooInfo, setBambooInfo] = useState('')
  const [workableStatus, setWorkableStatus] = useState<ConnStatus>('idle')
  const [workableAccounts, setWorkableAccounts] = useState<{ name: string; subdomain: string }[]>([])

  const testJira = async () => {
    setJiraStatus('testing')
    try {
      const res = await fetch('/api/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: values.JIRA_BASE_URL, email: values.JIRA_EMAIL, token: values.JIRA_API_TOKEN }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Connection failed')
      setJiraInfo(data.displayName ? `Authenticated as ${data.displayName}` : '')
      setJiraStatus('ok')
      toast.success('JIRA connection successful')
    } catch (e) {
      setJiraStatus('error')
      toast.error(e instanceof Error ? e.message : 'JIRA connection failed')
    }
  }

  const testTempo = async () => {
    setTempoStatus('testing')
    try {
      const res = await fetch('/api/tempo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.TEMPO_API_TOKEN }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Connection failed')
      setTempoStatus('ok')
      toast.success('Tempo connection successful')
    } catch (e) {
      setTempoStatus('error')
      toast.error(e instanceof Error ? e.message : 'Tempo connection failed')
    }
  }

  const testBamboo = async () => {
    setBambooStatus('testing')
    try {
      const res = await fetch('/api/bamboohr/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: values.BAMBOO_API_KEY, subdomain: values.BAMBOO_SUBDOMAIN }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Connection failed')
      setBambooInfo(data.employeeCount != null ? `${data.employeeCount} employees found` : '')
      setBambooStatus('ok')
      toast.success('BambooHR connection successful')
    } catch (e) {
      setBambooStatus('error')
      toast.error(e instanceof Error ? e.message : 'BambooHR connection failed')
    }
  }

  const testWorkable = async () => {
    setWorkableStatus('testing')
    try {
      const res = await fetch('/api/workable/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.WORKABLE_API_TOKEN }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Connection failed')
      setWorkableAccounts(data.accounts ?? [])
      setWorkableStatus('ok')
      toast.success('Workable connection successful')
    } catch (e) {
      setWorkableStatus('error')
      toast.error(e instanceof Error ? e.message : 'Workable connection failed')
    }
  }

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ data }) => { setValues({ ...DEFAULT, ...data }) })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key: string) => setShowTokens(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error()
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* JIRA */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
            <Plug className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">JIRA Integration</h2>
            <p className="text-xs text-muted-foreground">Connection credentials for Atlassian JIRA</p>
          </div>
          <StatusBadge status={jiraStatus} />
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field
            label="Base URL"
            value={values.JIRA_BASE_URL}
            placeholder="https://yourcompany.atlassian.net"
            onChange={v => { setValues(prev => ({ ...prev, JIRA_BASE_URL: v })); setJiraStatus('idle') }}
          />
          <Field
            label="Email"
            type="email"
            value={values.JIRA_EMAIL}
            placeholder="your@email.com"
            onChange={v => { setValues(prev => ({ ...prev, JIRA_EMAIL: v })); setJiraStatus('idle') }}
          />
          <Field
            label="API Token"
            value={values.JIRA_API_TOKEN}
            placeholder="ATATT3x..."
            secret
            show={!!showTokens['JIRA_API_TOKEN']}
            onToggleShow={() => toggle('JIRA_API_TOKEN')}
            onChange={v => { setValues(prev => ({ ...prev, JIRA_API_TOKEN: v })); setJiraStatus('idle') }}
          />
          <div className="flex items-center gap-3">
            <TestButton
              status={jiraStatus}
              disabled={!values.JIRA_BASE_URL || !values.JIRA_EMAIL || !values.JIRA_API_TOKEN}
              onClick={testJira}
            />
            {jiraStatus === 'ok' && jiraInfo && (
              <span className="text-xs text-muted-foreground">{jiraInfo}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tempo */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
            <RefreshCw className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Tempo Integration</h2>
            <p className="text-xs text-muted-foreground">API token for Tempo time tracking</p>
          </div>
          <StatusBadge status={tempoStatus} />
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field
            label="Tempo API Token"
            value={values.TEMPO_API_TOKEN}
            placeholder="qLfrNq..."
            secret
            show={!!showTokens['TEMPO_API_TOKEN']}
            onToggleShow={() => toggle('TEMPO_API_TOKEN')}
            onChange={v => { setValues(prev => ({ ...prev, TEMPO_API_TOKEN: v })); setTempoStatus('idle') }}
          />
          <TestButton
            status={tempoStatus}
            disabled={!values.TEMPO_API_TOKEN}
            onClick={testTempo}
          />
        </div>
      </div>

      {/* BambooHR */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10">
            <TreePalm className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">BambooHR Integration</h2>
            <p className="text-xs text-muted-foreground">API credentials for BambooHR HR platform</p>
          </div>
          <StatusBadge status={bambooStatus} />
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field
            label="Company Subdomain"
            value={values.BAMBOO_SUBDOMAIN}
            placeholder="yourcompany"
            onChange={v => { setValues(prev => ({ ...prev, BAMBOO_SUBDOMAIN: v })); setBambooStatus('idle') }}
          />
          <Field
            label="API Key"
            value={values.BAMBOO_API_KEY}
            placeholder="99dc1e2e..."
            secret
            show={!!showTokens['BAMBOO_API_KEY']}
            onToggleShow={() => toggle('BAMBOO_API_KEY')}
            onChange={v => { setValues(prev => ({ ...prev, BAMBOO_API_KEY: v })); setBambooStatus('idle') }}
          />
          <div className="flex items-center gap-3">
            <TestButton
              status={bambooStatus}
              disabled={!values.BAMBOO_API_KEY || !values.BAMBOO_SUBDOMAIN}
              onClick={testBamboo}
            />
            {bambooStatus === 'ok' && bambooInfo && (
              <span className="text-xs text-muted-foreground">{bambooInfo}</span>
            )}
          </div>
        </div>
      </div>

      {/* Workable */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Workable Integration</h2>
            <p className="text-xs text-muted-foreground">API token for Workable recruitment platform</p>
          </div>
          <StatusBadge status={workableStatus} />
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field
            label="API Token"
            value={values.WORKABLE_API_TOKEN}
            placeholder="Qr2pXPP..."
            secret
            show={!!showTokens['WORKABLE_API_TOKEN']}
            onToggleShow={() => toggle('WORKABLE_API_TOKEN')}
            onChange={v => { setValues(prev => ({ ...prev, WORKABLE_API_TOKEN: v })); setWorkableStatus('idle') }}
          />
          <div className="flex items-center gap-3">
            <TestButton
              status={workableStatus}
              disabled={!values.WORKABLE_API_TOKEN}
              onClick={testWorkable}
            />
            {workableStatus === 'ok' && workableAccounts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {workableAccounts.map(a => a.name).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#ea2775] hover:bg-[#d41f66] text-white gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

function Field({
  label, value, placeholder, type = 'text', secret = false, show, onToggleShow, onChange,
}: {
  label: string
  value: string
  placeholder?: string
  type?: string
  secret?: boolean
  show?: boolean
  onToggleShow?: () => void
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775] transition-colors pr-9"
        />
        {secret && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
