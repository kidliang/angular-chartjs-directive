// AngularJS 应用主文件
angular.module('QuizApp', [])
.controller('MainController', ['$scope', '$timeout', function($scope, $timeout) {
    
    // 初始化数据
    $scope.currentView = 'home';
    $scope.forms = JSON.parse(localStorage.getItem('quizForms')) || [];
    $scope.newForm = {
        title: '',
        description: '',
        type: 'quiz',
        questions: []
    };
    
    // 视图切换
    $scope.showView = function(view) {
        $scope.currentView = view;
        if (view === 'stats' && $scope.forms.length > 0) {
            $timeout(function() {
                $scope.initCharts();
            }, 100);
        }
    };
    
    // 添加问题
    $scope.addQuestion = function() {
        $scope.newForm.questions.push({
            text: '',
            type: 'text',
            options: [],
            required: true
        });
    };
    
    // 删除问题
    $scope.removeQuestion = function(index) {
        $scope.newForm.questions.splice(index, 1);
    };
    
    // 添加选项
    $scope.addOption = function(question) {
        if (!question.options) {
            question.options = [];
        }
        question.options.push({ text: '', value: question.options.length });
    };
    
    // 删除选项
    $scope.removeOption = function(question, index) {
        question.options.splice(index, 1);
    };
    
    // 监听问题类型变化，自动添加选项
    $scope.$watch('newForm.questions', function(questions) {
        if (questions) {
            questions.forEach(function(question) {
                if ((question.type === 'choice' || question.type === 'multiple') && 
                    (!question.options || question.options.length === 0)) {
                    question.options = [
                        { text: '选项 A', value: 0 },
                        { text: '选项 B', value: 1 }
                    ];
                }
            });
        }
    }, true);
    
    // 创建表单
    $scope.createForm = function() {
        if (!$scope.newForm.title) {
            alert('请输入表单标题');
            return;
        }
        
        if ($scope.newForm.questions.length === 0) {
            alert('请至少添加一个问题');
            return;
        }
        
        // 验证问题
        for (var i = 0; i < $scope.newForm.questions.length; i++) {
            var question = $scope.newForm.questions[i];
            if (!question.text) {
                alert('请完整填写第 ' + (i + 1) + ' 个问题');
                return;
            }
            
            if ((question.type === 'choice' || question.type === 'multiple') && 
                (!question.options || question.options.length < 2)) {
                alert('选择题至少需要2个选项');
                return;
            }
        }
        
        var form = {
            id: 'form_' + Date.now(),
            title: $scope.newForm.title,
            description: $scope.newForm.description,
            type: $scope.newForm.type,
            questions: angular.copy($scope.newForm.questions),
            createdAt: new Date(),
            submissions: []
        };
        
        $scope.forms.push(form);
        $scope.saveData();
        
        // 重置表单
        $scope.newForm = {
            title: '',
            description: '',
            type: 'quiz',
            questions: []
        };
        
        alert('表单创建成功！');
        $scope.showView('manage');
    };
    
    // 获取类型标签
    $scope.getTypeLabel = function(type) {
        var labels = {
            'quiz': '测验',
            'assignment': '作业',
            'survey': '调查'
        };
        return labels[type] || type;
    };
    
    // 获取分享链接
    $scope.getShareLink = function(formId) {
        return window.location.origin + window.location.pathname + 'submit.html?id=' + formId;
    };
    
    // 复制链接
    $scope.copyLink = function(formId) {
        var link = $scope.getShareLink(formId);
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link).then(function() {
                alert('链接已复制到剪贴板');
            });
        } else {
            // 降级方案
            var textArea = document.createElement('textarea');
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('链接已复制到剪贴板');
            } catch (err) {
                alert('复制失败，请手动复制链接：' + link);
            }
            document.body.removeChild(textArea);
        }
    };
    
    // 删除表单
    $scope.deleteForm = function(formId) {
        if (confirm('确定要删除这个表单吗？所有相关数据将被删除。')) {
            $scope.forms = $scope.forms.filter(function(form) {
                return form.id !== formId;
            });
            $scope.saveData();
            alert('表单已删除');
        }
    };
    
    // 查看提交
    $scope.viewSubmissions = function(form) {
        $scope.currentForm = form;
        $scope.showView('submissions');
    };
    
    // 获取问题类型标签
    $scope.getQuestionTypeLabel = function(type) {
        var labels = {
            'text': '文本题',
            'number': '数字题',
            'choice': '单选题',
            'multiple': '多选题'
        };
        return labels[type] || type;
    };
    
    // 导出提交数据
    $scope.exportSubmissions = function(form) {
        if (!form || !form.submissions || form.submissions.length === 0) {
            alert('没有数据可以导出');
            return;
        }
        
        var csvContent = "data:text/csv;charset=utf-8,";
        
        // 添加头部
        var headers = ['提交ID', '提交时间'];
        form.questions.forEach(function(question, index) {
            headers.push('Q' + (index + 1) + ': ' + question.text);
        });
        csvContent += headers.join(',') + '\n';
        
        // 添加数据行
        form.submissions.forEach(function(submission) {
            var row = [
                submission.id,
                new Date(submission.submittedAt).toLocaleString()
            ];
            
            form.questions.forEach(function(question, index) {
                var answer = submission.answers[index];
                if (answer) {
                    if (answer.type === 'multiple' && Array.isArray(answer.value)) {
                        row.push('"' + answer.value.map(function(opt) { return opt.text; }).join('; ') + '"');
                    } else if (answer.type === 'choice') {
                        row.push('"' + (answer.text || answer.value) + '"');
                    } else {
                        row.push('"' + (answer.value || '') + '"');
                    }
                } else {
                    row.push('');
                }
            });
            
            csvContent += row.join(',') + '\n';
        });
        
        // 创建下载链接
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', form.title + '_提交数据.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // 统计功能
    $scope.getTotalSubmissions = function() {
        return $scope.forms.reduce(function(total, form) {
            return total + form.submissions.length;
        }, 0);
    };
    
    $scope.getAverageSubmissions = function() {
        if ($scope.forms.length === 0) return 0;
        return Math.round($scope.getTotalSubmissions() / $scope.forms.length);
    };
    
    $scope.getMostPopularForm = function() {
        if ($scope.forms.length === 0) return '-';
        var mostPopular = $scope.forms.reduce(function(prev, current) {
            return (current.submissions.length > prev.submissions.length) ? current : prev;
        });
        return mostPopular.title;
    };
    
    // 初始化图表
    $scope.initCharts = function() {
        // 表单类型分布图
        var typeData = {
            'quiz': 0,
            'assignment': 0,
            'survey': 0
        };
        
        $scope.forms.forEach(function(form) {
            typeData[form.type]++;
        });
        
        var ctx1 = document.getElementById('typeChart');
        if (ctx1) {
            new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['测验', '作业', '调查'],
                    datasets: [{
                        data: [typeData.quiz, typeData.assignment, typeData.survey],
                        backgroundColor: ['#007bff', '#28a745', '#17a2b8'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // 提交量趋势图（简化版，按表单显示）
        var ctx2 = document.getElementById('submissionChart');
        if (ctx2) {
            var labels = $scope.forms.map(function(form) {
                return form.title.length > 10 ? form.title.substring(0, 10) + '...' : form.title;
            });
            var data = $scope.forms.map(function(form) {
                return form.submissions.length;
            });
            
            new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '提交数量',
                        data: data,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    };
    
    // 保存数据到本地存储
    $scope.saveData = function() {
        localStorage.setItem('quizForms', JSON.stringify($scope.forms));
    };
    
    // 初始化
    if ($scope.forms.length === 0) {
        // 添加示例数据
        var sampleForm = {
            id: 'form_sample',
            title: '示例测验：前端开发基础',
            description: '这是一个关于前端开发基础知识的测验',
            type: 'quiz',
            questions: [
                {
                    text: 'HTML是什么的缩写？',
                    type: 'choice',
                    options: [
                        { text: 'HyperText Markup Language', value: 0 },
                        { text: 'High Tech Modern Language', value: 1 },
                        { text: 'Home Tool Markup Language', value: 2 }
                    ],
                    required: true
                },
                {
                    text: '请简要描述CSS的作用',
                    type: 'text',
                    required: true
                }
            ],
            createdAt: new Date(),
            submissions: [
                {
                    id: 'sub_1',
                    submittedAt: new Date(),
                    answers: {
                        0: { value: 0, text: 'HyperText Markup Language' },
                        1: { value: 'CSS用于控制网页的样式和布局' }
                    }
                },
                {
                    id: 'sub_2',
                    submittedAt: new Date(),
                    answers: {
                        0: { value: 0, text: 'HyperText Markup Language' },
                        1: { value: 'CSS是层叠样式表，用于美化网页' }
                    }
                }
            ]
        };
        
        $scope.forms.push(sampleForm);
        $scope.saveData();
    }
    
    // 初始添加一个问题
    if ($scope.newForm.questions.length === 0) {
        $scope.addQuestion();
    }
}]);