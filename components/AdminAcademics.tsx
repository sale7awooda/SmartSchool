function AdminAcademics() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "overview" | "years" | "classes" | "subjects"
  >("overview");

  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: academicYearsData, isLoading: isYearsLoading, mutate: mutateYears } = useSWR('academicYears', () => getAcademicYears());
  const { data: classesData, isLoading: isClassesLoading, mutate: mutateClasses } = useSWR('classes', () => getClasses());
  const { data: subjectsData, isLoading: isSubjectsLoading, mutate: mutateSubjects } = useSWR('subjects', () => getSubjects());

  const isLoading = isYearsLoading || isClassesLoading || isSubjectsLoading;
  const academicYears = academicYearsData || [];
  const classes = classesData || [];
  const subjects = subjectsData || [];

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const yearData = {
      name: formData.get("name") as string,
      start_date: formData.get("startDate") as string,
      end_date: formData.get("endDate") as string,
      is_active: editingYear ? editingYear.is_active : true
    };

    try {
      if (editingYear) {
        const updatedYear = await updateAcademicYear(editingYear.id, yearData);
        mutateYears(academicYears.map(y => y.id === editingYear.id ? updatedYear : y));
        toast.success("Academic year updated successfully");
      } else {
        const newYear = await createAcademicYear(yearData);
        mutateYears([newYear, ...academicYears]);
        toast.success("Academic year created successfully");
      }
      setIsAddYearOpen(false);
      setEditingYear(null);
    } catch (error) {
      console.error("Error saving academic year:", error);
      toast.error("Failed to save academic year");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteYear = async (id: string) => {
    try {
      await deleteAcademicYear(id);
      mutateYears(academicYears.filter(y => y.id !== id));
      toast.success("Academic year deleted successfully");
    } catch (error) {
      console.error("Error deleting academic year:", error);
      toast.error("Failed to delete academic year");
    }
  };

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const classData = {
      name: formData.get("name") as string,
      grade: formData.get("grade") as string,
      section: formData.get("section") as string,
      academic_year_id: formData.get("academicYearId") as string
    };

    try {
      if (editingClass) {
        const updatedClass = await updateClass(editingClass.id, classData);
        mutateClasses(classes.map(c => c.id === editingClass.id ? updatedClass : c));
        toast.success("Class updated successfully");
      } else {
        const newClass = await createClass(classData);
        mutateClasses([newClass, ...classes]);
        toast.success("Class created successfully");
      }
      setIsAddClassOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await deleteClass(id);
      mutateClasses(classes.filter(c => c.id !== id));
      toast.success("Class deleted successfully");
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const subjectData = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      description: formData.get("description") as string
    };

    try {
      if (editingSubject) {
        const updatedSubject = await updateSubject(editingSubject.id, subjectData);
        mutateSubjects(subjects.map(s => s.id === editingSubject.id ? updatedSubject : s));
        toast.success("Subject updated successfully");
      } else {
        const newSubject = await createSubject(subjectData);
        mutateSubjects([newSubject, ...subjects]);
        toast.success("Subject created successfully");
      }
      setIsAddSubjectOpen(false);
      setEditingSubject(null);
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      mutateSubjects(subjects.filter(s => s.id !== id));
      toast.success("Subject deleted successfully");
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 h-full flex flex-col p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-5 w-96 bg-muted rounded-xl" />
          </div>
          <div className="h-12 w-48 bg-muted rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
          <div className="h-10 w-24 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
        <div className="flex-1">
          <div className="h-full min-h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {t('academics')}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('academics_desc')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {(["overview", "years", "classes", "subjects"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:bg-muted hover:border-border"
            }`}
          >
            {t(tab === 'years' ? 'academic_years' : tab)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Calendar size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('active')} {t('date')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {academicYears.find(y => y.is_active)?.name || t('none')}
              </p>
              <p className="text-xs font-medium text-emerald-500 mt-2 bg-emerald-500/10 w-fit px-2 py-1 rounded-md">
                {t('academics')}
              </p>
            </div>
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('total')} {t('classes')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{classes.length}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                {t('across_all_grades')}
              </p>
            </div>
            <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <Award size={24} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t('total')} {t('subjects')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{subjects.length}</p>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                {t('active_curriculum')}
              </p>
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('classes_sections')}
              </h3>
              <button 
                onClick={() => setIsAddClassOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_class')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {classes.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                classes.map((cls, i) => (
                  <div
                    key={cls.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {cls.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {cls.grade} • {t('section')} {cls.section || t('none')}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        {t('year')}: {cls.academic_year?.name} • {t('teacher')}: {cls.teacher?.name || t('none')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingClass(cls);
                          setIsAddClassOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            handleDeleteClass(cls.id);
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "years" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('academic_years')}
              </h3>
              <button 
                onClick={() => setIsAddYearOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_year')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {academicYears.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                academicYears.map((year) => (
                  <div
                    key={year.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {year.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {year.start_date} {t('to')} {year.end_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        year.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {year.is_active ? t('active') : t('inactive')}
                      </span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingYear(year);
                            setIsAddYearOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              handleDeleteYear(year.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50">
              <h3 className="font-bold text-foreground text-lg">
                {t('curriculum_subjects')}
              </h3>
              <button 
                onClick={() => setIsAddSubjectOpen(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={16} /> {t('add_subject')}
              </button>
            </div>
            <div className="divide-y divide-border">
              {subjects.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium">
                  {t('no_data')}
                </div>
              ) : (
                subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-foreground text-lg">
                        {subject.name}
                      </h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {t('subject_code')}: {subject.code || t('none')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {subject.description || t('no_data')}
                      </p>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingSubject(subject);
                            setIsAddSubjectOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              handleDeleteSubject(subject.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddYearOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingYear ? t('edit_year') : t('add_year')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingYear ? t('update_academic_year_desc') : t('create_academic_year_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateYear} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('year_name')}</label>
                  <input required name="name" type="text" defaultValue={editingYear?.name} placeholder="e.g., 2024 - 2025" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('start_date')}</label>
                    <input required name="startDate" type="date" defaultValue={editingYear?.start_date} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('end_date')}</label>
                    <input required name="endDate" type="date" defaultValue={editingYear?.end_date} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddYearOpen(false);
                      setEditingYear(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingYear ? t('save_changes') : t('add_year'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddClassOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingClass ? t('edit_class') : t('add_class')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingClass ? t('update_class_desc') : t('create_class_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateClass} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('class_name')}</label>
                  <input required name="name" type="text" defaultValue={editingClass?.name} placeholder="e.g., Grade 4 - Section A" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('grade')}</label>
                    <input required name="grade" type="text" defaultValue={editingClass?.grade} placeholder="e.g., Grade 4" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('section')}</label>
                    <input name="section" type="text" defaultValue={editingClass?.section} placeholder="e.g., A" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('academic_year')}</label>
                  <select required name="academicYearId" defaultValue={editingClass?.academic_year_id} className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                    {academicYears.map(year => (
                      <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddClassOpen(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingClass ? t('save_changes') : t('add_class'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{editingSubject ? t('edit_subject') : t('add_subject')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{editingSubject ? t('update_subject_desc') : t('create_subject_desc')}</p>
              </div>
              
              <form onSubmit={handleCreateSubject} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('subject_name')}</label>
                  <input required name="name" type="text" defaultValue={editingSubject?.name} placeholder="e.g., Mathematics" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('subject_code')}</label>
                  <input required name="code" type="text" defaultValue={editingSubject?.code} placeholder="e.g., MATH101" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('description')}</label>
                  <textarea name="description" rows={3} defaultValue={editingSubject?.description} placeholder="Brief description of the subject..." className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddSubjectOpen(false);
                      setEditingSubject(null);
                    }}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingSubject ? t('save_changes') : t('add_subject'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Types & Mock Data for Assessments ---
type AssessmentType =
  | "Homework"
  | "Assignment"
  | "Online Exam"
  | "Offline Exam";

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  subject: string;
  class: string;
  maxScore: number;
  date: string;
  status: "Draft" | "Published" | "Graded";
  description?: string;
  attachments?: string[];
}

interface StudentSubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  status: "To Do" | "In Progress" | "Submitted" | "Graded";
  submittedAt?: string;
  files?: string[];
  score?: number;
  feedback?: string;
}

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "a1",
    title: "Algebra Chapter 1",
    type: "Homework",
    subject: "Mathematics",
    class: "Grade 4 - Section A",
    maxScore: 10,
    date: "2023-10-15",
    status: "Graded",
    description: "Complete exercises 1-20 on page 45.",
  },
  {
    id: "a2",
    title: "Midterm Exam",
    type: "Offline Exam",
    subject: "Mathematics",
    class: "Grade 4 - Section A",
    maxScore: 100,
    date: "2023-10-20",
    status: "Published",
  },
  {
    id: "a3",
    title: "Cell Structure Quiz",
    type: "Online Exam",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 20,
    date: "2023-10-22",
    status: "Published",
  },
  {
    id: "a4",
    title: "Lab Report 1",
    type: "Assignment",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 50,
    date: "2023-10-25",
    status: "Draft",
    description:
      "Write a detailed report on the photosynthesis experiment. Include your hypothesis, methodology, results, and conclusion.",
  },
  {
    id: "a5",
    title: "Solar System Project",
    type: "Assignment",
    subject: "Science",
    class: "Grade 4 - Section A",
    maxScore: 100,
    date: "2023-11-05",
    status: "Published",
    description:
      "Create a model of the solar system and write a 2-page report on your favorite planet.",
  },
];

const MOCK_SUBMISSIONS: StudentSubmission[] = [
  {
    id: "sub1",
    assessmentId: "a5",
    studentId: "STU001",
    status: "In Progress",
  },
  { id: "sub2", assessmentId: "a4", studentId: "STU001", status: "To Do" },
  {
    id: "sub3",
    assessmentId: "a1",
    studentId: "STU001",
    status: "Graded",
    score: 10,
    feedback: "Excellent work!",
  },
];

const getAssessmentIcon = (type: AssessmentType) => {
  switch (type) {
    case "Homework":
      return <FileText size={18} />;
    case "Assignment":
      return <ClipboardList size={18} />;
    case "Online Exam":
      return <Monitor size={18} />;
    case "Offline Exam":
      return <PenTool size={18} />;
  }
};

const getAssessmentColor = (type: AssessmentType) => {
  switch (type) {
    case "Homework":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Assignment":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "Online Exam":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Offline Exam":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
};

// --- Teacher View ---
