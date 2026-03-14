import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface StepFormData {
  id?: string;
  step_number: number;
  process: string;
  date_from: string;
  date_to: string;
  expense_real: number;
  expense_bribe: number;
  expense_mind: number;
  description: string;
  contact_name: string;
  contact_number: string;
  contact_department: string;
}

const EMPTY: StepFormData = {
  step_number: 1,
  process: '',
  date_from: '',
  date_to: '',
  expense_real: 0,
  expense_bribe: 0,
  expense_mind: 0,
  description: '',
  contact_name: '',
  contact_number: '',
  contact_department: '',
};

type ExpenseType = 'Real' | 'Bribe' | 'Mind';
const EXPENSE_TYPES: { key: ExpenseType; field: keyof StepFormData; color: string; bg: string }[] = [
  { key: 'Real', field: 'expense_real', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'Bribe', field: 'expense_bribe', color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'Mind', field: 'expense_mind', color: 'text-purple-600', bg: 'bg-purple-50' },
];

interface Props {
  open: boolean;
  stepNumber: number;
  initial?: Partial<StepFormData>;
  onSave: (data: StepFormData) => void;
  onClose: () => void;
}

export default function AddStepModal({ open, stepNumber, initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<StepFormData>(() => ({
    ...EMPTY,
    step_number: stepNumber,
    process: `Step ${stepNumber}`,
    ...initial,
  }));

  const [showExpensePicker, setShowExpensePicker] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [expenseInput, setExpenseInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const set = (key: keyof StepFormData, val: string | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  // Day diff
  const dayDiff = useMemo(() => {
    if (!form.date_from || !form.date_to) return null;
    const from = new Date(form.date_from);
    const to = new Date(form.date_to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
    const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [form.date_from, form.date_to]);

  // Word count
  const wordCount = form.description.trim() ? form.description.trim().split(/\s+/).length : 0;

  // Added expenses
  const addedExpenses = EXPENSE_TYPES.filter(
    (e) => (form[e.field] as number) > 0
  );

  const handleAddExpenseType = (type: ExpenseType) => {
    setShowExpensePicker(false);
    setEditingExpense(type);
    const existing = form[EXPENSE_TYPES.find((e) => e.key === type)!.field] as number;
    setExpenseInput(existing > 0 ? String(existing) : '');
  };

  const handleSaveExpense = () => {
    if (!editingExpense) return;
    const entry = EXPENSE_TYPES.find((e) => e.key === editingExpense)!;
    set(entry.field, Number(expenseInput) || 0);
    setEditingExpense(null);
    setExpenseInput('');
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.process.trim()) errs.push('Process is required');
    if (!form.date_from) errs.push('From date is required');
    if (!form.date_to) errs.push('To date is required');
    if (form.date_from && form.date_to && new Date(form.date_to) < new Date(form.date_from))
      errs.push('To date must be after From date');
    if (addedExpenses.length === 0 && !form.expense_real && !form.expense_bribe && !form.expense_mind)
      errs.push('At least 1 expense entry required');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    // Enforce 50 word limit
    const words = form.description.trim().split(/\s+/);
    const desc = words.slice(0, 50).join(' ');
    onSave({ ...form, description: desc });
  };

  const formatDateForInput = (d: string) => d;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-background overflow-y-auto"
        >
          <div className="px-5 pt-6 pb-10 max-w-lg mx-auto">
            {/* Step title */}
            <h1 className="text-[22px] font-bold text-[#1A3C8E] mb-6">Step {stepNumber}</h1>

            <div className="space-y-5">
              {/* Process */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-bold text-foreground">Process</label>
                <Input
                  className="border border-border rounded-lg px-4 py-3 h-auto text-base"
                  placeholder={`Step ${stepNumber}`}
                  value={form.process}
                  onChange={(e) => set('process', e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-bold text-foreground">Date</label>

                <div className="space-y-2">
                  <div>
                    <span className="text-[12px] text-muted-foreground">From</span>
                    <Input
                      type="date"
                      className="border border-border rounded-lg px-4 py-3 h-auto text-base mt-1"
                      value={form.date_from}
                      onChange={(e) => set('date_from', e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">To</span>
                      {dayDiff !== null && (
                        <span className="text-[12px] text-muted-foreground">
                          in {dayDiff} Day{dayDiff !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      className="border border-border rounded-lg px-4 py-3 h-auto text-base mt-1"
                      value={form.date_to}
                      onChange={(e) => set('date_to', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Expense */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-bold text-foreground">Expense</label>
                  <button
                    onClick={() => setShowExpensePicker(!showExpensePicker)}
                    className="bg-[#3B82F6] text-white text-[13px] font-medium px-5 py-1.5 rounded-full"
                  >
                    Add
                  </button>
                </div>

                {/* Expense type picker */}
                <AnimatePresence>
                  {showExpensePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2 overflow-hidden"
                    >
                      {EXPENSE_TYPES.map((e) => (
                        <button
                          key={e.key}
                          onClick={() => handleAddExpenseType(e.key)}
                          className={`flex-1 py-2 rounded-lg border text-[13px] font-medium ${e.color} ${e.bg}`}
                        >
                          {e.key}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Editing expense amount */}
                <AnimatePresence>
                  {editingExpense && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-[14px] font-bold text-foreground w-16">{editingExpense}</span>
                      <Input
                        type="number"
                        className="border border-border rounded-lg px-4 py-2 h-auto text-base flex-1"
                        placeholder="Amount"
                        value={expenseInput}
                        onChange={(e) => setExpenseInput(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveExpense}
                        className="bg-[#1A3C8E] text-white text-[13px] font-medium px-4 py-2 rounded-lg"
                      >
                        OK
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Added expenses */}
                {addedExpenses.map((e) => (
                  <div
                    key={e.key}
                    className="flex items-center justify-between bg-[#EEF3FF] rounded-lg px-4 py-2.5"
                  >
                    <span className={`text-[14px] font-bold ${e.color}`}>{e.key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-foreground font-medium">
                        {form[e.field] as number}
                      </span>
                      <button
                        onClick={() => handleAddExpenseType(e.key)}
                      >
                        <Pencil className="w-4 h-4 text-[#3B82F6]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-bold text-foreground">Description</label>
                <Textarea
                  rows={3}
                  className="border border-border rounded-lg px-4 py-3 text-base resize-none"
                  placeholder="Describe"
                  value={form.description}
                  onChange={(e) => {
                    const words = e.target.value.split(/\s+/);
                    if (words.length <= 50 || e.target.value.length < form.description.length) {
                      set('description', e.target.value);
                    }
                  }}
                />
                <p className={`text-[12px] text-right ${wordCount >= 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {wordCount}/50 words
                </p>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <label className="text-[14px] font-bold text-foreground">Contact Information</label>
                <Input
                  className="border border-border rounded-lg px-4 py-3 h-auto text-base"
                  placeholder="Name"
                  value={form.contact_name}
                  onChange={(e) => set('contact_name', e.target.value)}
                />
                <Input
                  className="border border-border rounded-lg px-4 py-3 h-auto text-base"
                  placeholder="Number"
                  type="tel"
                  value={form.contact_number}
                  onChange={(e) => set('contact_number', e.target.value)}
                />
                <Input
                  className="border border-border rounded-lg px-4 py-3 h-auto text-base"
                  placeholder="Department"
                  value={form.contact_department}
                  onChange={(e) => set('contact_department', e.target.value)}
                />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {errors.map((err, i) => (
                    <p key={i} className="text-[13px] text-red-600">{err}</p>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 text-red-500 font-medium text-[15px] py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-[#1A3C8E] text-white rounded-xl py-3 text-[15px] font-bold"
                >
                  {initial?.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
